import { useState, useEffect, useCallback, useMemo } from 'react';
import { api } from '@/api';

const STORAGE_KEY = 'llm-council-model-settings';

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveToStorage(settings) {
  if (settings) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
}

export function useModelSettings() {
  const [availableModels, setAvailableModels] = useState([]);
  const [defaultCouncil, setDefaultCouncil] = useState([]);
  const [defaultChairman, setDefaultChairman] = useState('');
  const [councilModels, setCouncilModels] = useState([]);
  const [chairmanModel, setChairmanModel] = useState('');
  const [loaded, setLoaded] = useState(false);

  const fetchModels = useCallback(async () => {
    try {
      const data = await api.getModels();
      setAvailableModels(data.available);
      setDefaultCouncil(data.default_council);
      setDefaultChairman(data.default_chairman);

      const saved = loadFromStorage();
      if (saved) {
        // Filter out any saved models that are no longer available
        const validCouncil = saved.councilModels.filter(m => data.available.includes(m));
        const validChairman = data.available.includes(saved.chairmanModel)
          ? saved.chairmanModel
          : data.default_chairman;
        setCouncilModels(validCouncil.length >= 2 ? validCouncil : data.default_council);
        setChairmanModel(validChairman);
      } else {
        setCouncilModels(data.default_council);
        setChairmanModel(data.default_chairman);
      }
      setLoaded(true);
    } catch (err) {
      console.error('Failed to fetch models:', err);
    }
  }, []);

  // Persist to localStorage whenever settings change (after initial load)
  useEffect(() => {
    if (!loaded) return;
    const isDefault =
      JSON.stringify(councilModels.slice().sort()) === JSON.stringify(defaultCouncil.slice().sort()) &&
      chairmanModel === defaultChairman;
    saveToStorage(isDefault ? null : { councilModels, chairmanModel });
  }, [councilModels, chairmanModel, defaultCouncil, defaultChairman, loaded]);

  const toggleCouncilModel = useCallback((model) => {
    setCouncilModels(prev => {
      if (prev.includes(model)) {
        if (prev.length <= 2) return prev; // min 2
        return prev.filter(m => m !== model);
      }
      return [...prev, model];
    });
  }, []);

  const resetToDefaults = useCallback(() => {
    setCouncilModels(defaultCouncil);
    setChairmanModel(defaultChairman);
    saveToStorage(null);
  }, [defaultCouncil, defaultChairman]);

  const isCustom = useMemo(() => {
    if (!loaded) return false;
    return (
      JSON.stringify(councilModels.slice().sort()) !== JSON.stringify(defaultCouncil.slice().sort()) ||
      chairmanModel !== defaultChairman
    );
  }, [councilModels, chairmanModel, defaultCouncil, defaultChairman, loaded]);

  const modelConfig = useMemo(() => {
    if (!isCustom) return undefined;
    return { council_models: councilModels, chairman_model: chairmanModel };
  }, [isCustom, councilModels, chairmanModel]);

  return {
    availableModels,
    councilModels,
    chairmanModel,
    setChairmanModel,
    toggleCouncilModel,
    resetToDefaults,
    isCustom,
    modelConfig,
    fetchModels,
    loaded,
  };
}
