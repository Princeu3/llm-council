import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { getModelShortName } from '../utils';
import './Stage2.css';

function deAnonymizeText(text, labelToModel) {
  if (!labelToModel) return text;

  let result = text;
  for (const [label, model] of Object.entries(labelToModel)) {
    result = result.replace(new RegExp(label, 'g'), `**${getModelShortName(model)}**`);
  }
  return result;
}

export default function Stage2({ rankings, labelToModel, aggregateRankings }) {
  const [activeTab, setActiveTab] = useState(0);

  if (!rankings || rankings.length === 0) return null;

  const active = rankings[activeTab];
  const parsedRanking = active.parsed_ranking || [];

  return (
    <div className="stage stage2">
      <h3 className="stage-title">Stage 2: Peer Rankings</h3>

      <h4>Raw Evaluations</h4>
      <p className="stage-description">
        Each model evaluated all responses (anonymized as Response A, B, C, etc.) and provided rankings.
        Below, model names are shown in <strong>bold</strong> for readability, but the original evaluation used anonymous labels.
      </p>

      <div className="tabs">
        {rankings.map((rank, index) => (
          <button
            key={index}
            className={`tab ${activeTab === index ? 'active' : ''}`}
            onClick={() => setActiveTab(index)}
          >
            {getModelShortName(rank.model)}
          </button>
        ))}
      </div>

      <div className="tab-content">
        <div className="ranking-model">{active.model}</div>
        <div className="ranking-content markdown-content">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {deAnonymizeText(active.ranking, labelToModel)}
          </ReactMarkdown>
        </div>

        {parsedRanking.length > 0 && (
          <div className="parsed-ranking">
            <strong>Extracted Ranking:</strong>
            <ol>
              {parsedRanking.map((label, i) => (
                <li key={i}>
                  {labelToModel?.[label]
                    ? getModelShortName(labelToModel[label])
                    : label}
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>

      {aggregateRankings && aggregateRankings.length > 0 && (
        <div className="aggregate-rankings">
          <h4>Aggregate Rankings (Street Cred)</h4>
          <p className="stage-description">
            Combined results across all peer evaluations (lower score is better):
          </p>
          <div className="aggregate-list">
            {aggregateRankings.map((agg, index) => (
              <div key={index} className="aggregate-item">
                <span className="rank-position">#{index + 1}</span>
                <span className="rank-model">{getModelShortName(agg.model)}</span>
                <span className="rank-score">Avg: {agg.average_rank.toFixed(2)}</span>
                <span className="rank-count">({agg.rankings_count} votes)</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
