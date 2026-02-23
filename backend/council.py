"""3-stage LLM Council orchestration."""

import re
from collections import defaultdict
from typing import Any, Dict, List, Optional, Tuple

from .config import CHAIRMAN_MODEL, COUNCIL_MODELS
from .openrouter import query_model, query_models_parallel


async def stage1_collect_responses(
    user_query: str,
    council_models: Optional[List[str]] = None,
) -> List[Dict[str, Any]]:
    """Stage 1: Query all council models in parallel and collect responses."""
    models = council_models or COUNCIL_MODELS
    messages = [{"role": "user", "content": user_query}]
    responses = await query_models_parallel(models, messages)

    return [
        {"model": model, "response": response.get("content", "")}
        for model, response in responses.items()
        if response is not None
    ]


async def stage2_collect_rankings(
    user_query: str,
    stage1_results: List[Dict[str, Any]],
    council_models: Optional[List[str]] = None,
) -> Tuple[List[Dict[str, Any]], Dict[str, str]]:
    """Stage 2: Each model ranks the anonymized responses from Stage 1."""
    labels = [chr(65 + i) for i in range(len(stage1_results))]

    label_to_model = {
        f"Response {label}": result["model"]
        for label, result in zip(labels, stage1_results)
    }

    responses_text = "\n\n".join(
        f"Response {label}:\n{result['response']}"
        for label, result in zip(labels, stage1_results)
    )

    ranking_prompt = f"""You are evaluating different responses to the following question:

Question: {user_query}

Here are the responses from different models (anonymized):

{responses_text}

Your task:
1. First, evaluate each response individually. For each response, explain what it does well and what it does poorly.
2. Then, at the very end of your response, provide a final ranking.

IMPORTANT: Your final ranking MUST be formatted EXACTLY as follows:
- Start with the line "FINAL RANKING:" (all caps, with colon)
- Then list the responses from best to worst as a numbered list
- Each line should be: number, period, space, then ONLY the response label (e.g., "1. Response A")
- Do not add any other text or explanations in the ranking section

Example of the correct format for your ENTIRE response:

Response A provides good detail on X but misses Y...
Response B is accurate but lacks depth on Z...
Response C offers the most comprehensive answer...

FINAL RANKING:
1. Response C
2. Response A
3. Response B

Now provide your evaluation and ranking:"""

    models = council_models or COUNCIL_MODELS
    messages = [{"role": "user", "content": ranking_prompt}]
    responses = await query_models_parallel(models, messages)

    stage2_results = []
    for model, response in responses.items():
        if response is not None:
            full_text = response.get("content", "")
            stage2_results.append({
                "model": model,
                "ranking": full_text,
                "parsed_ranking": parse_ranking_from_text(full_text),
            })

    return stage2_results, label_to_model


async def stage3_synthesize_final(
    user_query: str,
    stage1_results: List[Dict[str, Any]],
    stage2_results: List[Dict[str, Any]],
    chairman_model: Optional[str] = None,
) -> Dict[str, Any]:
    """Stage 3: Chairman synthesizes a final answer from all responses and rankings."""
    stage1_text = "\n\n".join(
        f"Model: {r['model']}\nResponse: {r['response']}" for r in stage1_results
    )
    stage2_text = "\n\n".join(
        f"Model: {r['model']}\nRanking: {r['ranking']}" for r in stage2_results
    )

    chairman_prompt = f"""You are the Chairman of an LLM Council. Multiple AI models have provided responses to a user's question, and then ranked each other's responses.

Original Question: {user_query}

STAGE 1 - Individual Responses:
{stage1_text}

STAGE 2 - Peer Rankings:
{stage2_text}

Your task as Chairman is to synthesize all of this information into a single, comprehensive, accurate answer to the user's original question. Consider:
- The individual responses and their insights
- The peer rankings and what they reveal about response quality
- Any patterns of agreement or disagreement

Provide a clear, well-reasoned final answer that represents the council's collective wisdom:"""

    chair = chairman_model or CHAIRMAN_MODEL
    response = await query_model(chair, [{"role": "user", "content": chairman_prompt}])

    if response is None:
        return {
            "model": chair,
            "response": "Error: Unable to generate final synthesis.",
        }

    return {"model": chair, "response": response.get("content", "")}


def parse_ranking_from_text(ranking_text: str) -> List[str]:
    """
    Parse the FINAL RANKING section from a model's evaluation response.

    Returns response labels in ranked order (e.g. ["Response C", "Response A"]).
    """
    _, _, ranking_section = ranking_text.partition("FINAL RANKING:")
    search_text = ranking_section or ranking_text

    # Prefer numbered list format (e.g. "1. Response A")
    numbered_matches = re.findall(r"\d+\.\s*(Response [A-Z])", search_text)
    if numbered_matches:
        return numbered_matches

    # Fallback: extract all "Response X" labels in order of appearance
    return re.findall(r"Response [A-Z]", search_text)


def calculate_aggregate_rankings(
    stage2_results: List[Dict[str, Any]],
    label_to_model: Dict[str, str],
) -> List[Dict[str, Any]]:
    """
    Calculate aggregate rankings from pre-parsed stage2 results.

    Returns list sorted by average rank (lower is better).
    """
    model_positions: Dict[str, List[int]] = defaultdict(list)

    for ranking in stage2_results:
        for position, label in enumerate(ranking.get("parsed_ranking", []), start=1):
            if label in label_to_model:
                model_positions[label_to_model[label]].append(position)

    aggregate = [
        {
            "model": model,
            "average_rank": round(sum(positions) / len(positions), 2),
            "rankings_count": len(positions),
        }
        for model, positions in model_positions.items()
        if positions
    ]
    aggregate.sort(key=lambda x: x["average_rank"])
    return aggregate


async def generate_conversation_title(user_query: str) -> str:
    """Generate a short title (3-5 words) for a conversation from the first message."""
    title_prompt = f"""Generate a very short title (3-5 words maximum) that summarizes the following question.
The title should be concise and descriptive. Do not use quotes or punctuation in the title.

Question: {user_query}

Title:"""

    response = await query_model(
        "google/gemini-2.5-flash",
        [{"role": "user", "content": title_prompt}],
        timeout=30.0,
    )

    if response is None:
        return "New Conversation"

    title = response.get("content", "New Conversation").strip().strip("\"'")
    if len(title) > 50:
        title = title[:47] + "..."
    return title


async def run_full_council(
    user_query: str,
    council_models: Optional[List[str]] = None,
    chairman_model: Optional[str] = None,
) -> Tuple[List, List, Dict, Dict]:
    """Run the complete 3-stage council process. Returns (stage1, stage2, stage3, metadata)."""
    stage1_results = await stage1_collect_responses(user_query, council_models)

    if not stage1_results:
        return [], [], {
            "model": "error",
            "response": "All models failed to respond. Please try again.",
        }, {}

    stage2_results, label_to_model = await stage2_collect_rankings(
        user_query, stage1_results, council_models
    )
    aggregate_rankings = calculate_aggregate_rankings(stage2_results, label_to_model)
    stage3_result = await stage3_synthesize_final(
        user_query, stage1_results, stage2_results, chairman_model
    )

    metadata = {
        "label_to_model": label_to_model,
        "aggregate_rankings": aggregate_rankings,
    }
    return stage1_results, stage2_results, stage3_result, metadata
