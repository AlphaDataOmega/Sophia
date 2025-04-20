export class EmotionEngine {
  private readonly emotionTransitions: Map<string, string[]> = new Map([
    ['joy', ['contentment', 'excitement', 'pride']],
    ['sadness', ['melancholy', 'disappointment', 'grief']],
    ['anger', ['frustration', 'irritation', 'rage']],
    ['fear', ['anxiety', 'worry', 'terror']],
    ['surprise', ['amazement', 'confusion', 'shock']],
    ['disgust', ['disapproval', 'revulsion', 'contempt']]
  ]);

  calculateEmotionalTransition(
    currentEmotion: EmotionalState,
    trigger: EmotionalTrigger,
    personalityTraits: PersonalityTrait[]
  ): EmotionalState {
    const possibleTransitions = this.emotionTransitions.get(currentEmotion.primary) || [];
    const neuroticism = this.getTraitValue(personalityTraits, 'neuroticism');
    const extraversion = this.getTraitValue(personalityTraits, 'extraversion');
    
    // Calculate transition probabilities based on personality traits
    const transitionScores = possibleTransitions.map(emotion => ({
      emotion,
      score: this.calculateTransitionScore(
        emotion,
        trigger,
        neuroticism,
        extraversion
      )
    }));

    // Select the most likely transition
    const selectedTransition = transitionScores.reduce((a, b) => 
      a.score > b.score ? a : b
    );

    return {
      primary: selectedTransition.emotion,
      intensity: this.calculateNewIntensity(currentEmotion.intensity, trigger.intensity),
      valence: this.calculateNewValence(selectedTransition.emotion),
      arousal: this.calculateNewArousal(selectedTransition.emotion, trigger.intensity)
    };
  }

  private calculateTransitionScore(
    emotion: string,
    trigger: EmotionalTrigger,
    neuroticism: number,
    extraversion: number
  ): number {
    // Complex scoring based on multiple factors
    let score = 0;

    // Personality influence
    score += neuroticism * this.getNegativeEmotionBias(emotion);
    score += extraversion * this.getPositiveEmotionBias(emotion);

    // Trigger influence
    score += this.getEmotionalCompatibility(emotion, trigger.type) * trigger.intensity;

    return score;
  }

  private getNegativeEmotionBias(emotion: string): number {
    const negativeEmotions = ['sadness', 'fear', 'anxiety', 'grief', 'melancholy'];
    return negativeEmotions.includes(emotion) ? 1 : 0;
  }

  private getPositiveEmotionBias(emotion: string): number {
    const positiveEmotions = ['joy', 'excitement', 'contentment', 'pride'];
    return positiveEmotions.includes(emotion) ? 1 : 0;
  }

  private getEmotionalCompatibility(emotion: string, triggerType: string): number {
    // Define emotional compatibility matrix
    const compatibility: Record<string, Record<string, number>> = {
      'joy': { 'success': 1, 'praise': 0.8, 'achievement': 0.9 },
      'sadness': { 'failure': 1, 'loss': 0.9, 'disappointment': 0.8 },
      // Add more mappings...
    };

    return compatibility[emotion]?.[triggerType] || 0.5;
  }

  private calculateNewIntensity(currentIntensity: number, triggerIntensity: number): number {
    return Math.min(1, (currentIntensity + triggerIntensity) / 2);
  }

  private calculateNewValence(emotion: string): number {
    const valenceMap: Record<string, number> = {
      'joy': 0.8,
      'contentment': 0.6,
      'excitement': 0.7,
      'pride': 0.9,
      'sadness': -0.7,
      'melancholy': -0.5,
      // Add more mappings...
    };

    return valenceMap[emotion] || 0;
  }

  private calculateNewArousal(emotion: string, intensity: number): number {
    const arousalMap: Record<string, number> = {
      'excitement': 0.9,
      'contentment': 0.3,
      'rage': 1.0,
      'melancholy': 0.2,
      // Add more mappings...
    };

    return Math.min(1, (arousalMap[emotion] || 0.5) * intensity);
  }

  private getTraitValue(traits: PersonalityTrait[], name: string): number {
    return traits.find(t => t.name.toLowerCase() === name.toLowerCase())?.value || 0.5;
  }
}
