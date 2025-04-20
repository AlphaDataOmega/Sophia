import { useState, useEffect } from 'react';

export function useAnimationLibrary() {
  const [animations, setAnimations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchAnimations();
  }, []);

  const fetchAnimations = async () => {
    try {
      const response = await fetch('/api/animations/list');
      const data = await response.json();
      setAnimations(data.animations);
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const uploadAnimation = async (file) => {
    const formData = new FormData();
    formData.append('animation', file);

    try {
      const response = await fetch('/api/animations/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();
      
      // Refresh animation list
      await fetchAnimations();
      
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  return { animations, loading, error, uploadAnimation, refreshAnimations: fetchAnimations };
}
