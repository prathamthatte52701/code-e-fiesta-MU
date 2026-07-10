import { TOPICS } from '../../utils/constants';

export const topicDependencyMap = {
  variables: [],
  'data-types': ['variables'],
  conditions: ['variables', 'data-types'],
  loops: ['conditions'],
  functions: ['loops'],
  lists: ['functions'],
  strings: ['lists'],
  oop: ['functions', 'lists'],
  'error-handling': ['oop'],
  algorithms: ['error-handling'],
};

const difficultyWeight = {
  EASY: 8,
  MEDIUM: 14,
  HARD: 20,
};

const mistakePracticeMap = {
  'syntax error': {
    title: 'Syntax Repair Sprint',
    focus: 'Syntax correction',
    task: 'Fix 5 short Python snippets with indentation, colon, and bracket issues.',
  },
  'logic error': {
    title: 'Dry-Run Logic Lab',
    focus: 'Step-by-step reasoning',
    task: 'Trace 5 Python snippets line by line and predict the final state.',
  },
  'loop condition error': {
    title: 'Loop Boundary Builder',
    focus: 'Loop start/end conditions',
    task: 'Solve 5 loop tracing questions focused on off-by-one and stop condition mistakes.',
  },
  'array indexing error': {
    title: 'Index Accuracy Drill',
    focus: 'List indexing',
    task: 'Complete 5 list access challenges using zero-based indexes and slices.',
  },
  'function misuse': {
    title: 'Return Value Clinic',
    focus: 'Function inputs and return values',
    task: 'Fix 4 functions where parameters, return values, or calls are used incorrectly.',
  },
  'variable naming issue': {
    title: 'Variable Meaning Drill',
    focus: 'Clear variable usage',
    task: 'Rename and use variables correctly in 5 short Python data tasks.',
  },
  'edge case failure': {
    title: 'Edge Case Shield',
    focus: 'Boundary tests',
    task: 'Add test cases for empty, minimum, maximum, and unusual inputs.',
  },
  'output mismatch': {
    title: 'Output Match Practice',
    focus: 'Exact print output',
    task: 'Predict and correct exact Python output for 5 snippets.',
  },
  'incomplete solution': {
    title: 'Complete the Missing Step',
    focus: 'Problem completion',
    task: 'Finish 4 partially written solutions by adding the missing logic.',
  },
  'time complexity issue': {
    title: 'Optimization Mini-Lab',
    focus: 'Efficient algorithms',
    task: 'Compare simple and optimized solutions for 3 search or sort tasks.',
  },
};

const clamp = (value, min = 0, max = 100) => Math.max(min, Math.min(max, Math.round(value)));

const average = (items) => {
  if (!items.length) return 0;
  return Math.round(items.reduce((sum, item) => sum + item, 0) / items.length);
};

const mode = (items) => {
  const counts = items.reduce((acc, item) => {
    if (!item) return acc;
    acc[item] = (acc[item] || 0) + 1;
    return acc;
  }, {});
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'None';
};

const topicName = (topicId) => TOPICS.find(topic => topic.id === topicId)?.name || topicId;

export const getMostCommonMistake = (mistakes = []) => mode(mistakes) || 'None';

export const classifyMistakes = (mistakes = []) => {
  const primary = getMostCommonMistake(mistakes);
  return {
    primary,
    count: mistakes.filter(mistake => mistake === primary).length,
    repeated: mistakes.filter(mistake => mistake === primary).length >= 2,
    targetedPractice: mistakePracticeMap[primary] || {
      title: 'Adaptive Practice Set',
      focus: 'Current weak concept',
      task: 'Complete a short mixed practice set based on recent mistakes.',
    },
  };
};

export const getMasteryBand = (mastery) => {
  if (mastery < 40) return 'Needs Revision';
  if (mastery < 60) return 'Developing';
  if (mastery < 80) return 'Ready to Progress';
  return 'Strong Mastery';
};

export const calculateMastery = (learner) => {
  const mistakePenalty = Math.min((learner.codingMistakes || []).length * 4, 18);
  const speedBonus = learner.learningSpeed === 'Fast' ? 8 : learner.learningSpeed === 'Slow' ? -6 : 2;
  const difficultyBonus = difficultyWeight[learner.currentDifficulty] || 8;
  const platformScore = average([
    learner.bossBattlePerformance || 0,
    learner.aiChallengePerformance || 0,
    learner.dailyChallengePerformance || 0,
  ]);

  return clamp(
    (learner.quizScore * 0.42)
    + (platformScore * 0.18)
    + (learner.engagementScoreAfter * 0.16)
    + difficultyBonus
    + speedBonus
    - mistakePenalty
  );
};

export const getNextTopic = (currentTopic) => {
  const current = TOPICS.find(topic => topic.id === currentTopic);
  return TOPICS.find(topic => topic.order === (current?.order || 0) + 1)?.id || currentTopic;
};

const hasWeakPrerequisite = (learner) => {
  const prereqs = topicDependencyMap[learner.currentTopic] || [];
  return prereqs.find(prereq =>
    !(learner.completedTopics || []).includes(prereq)
    || (learner.weakConcepts || []).some(concept => concept.toLowerCase().includes(topicName(prereq).toLowerCase()))
  );
};

export const generatePracticeChallenge = (learner, mastery, mistakeProfile) => {
  const practice = mistakeProfile.targetedPractice;
  const weakConcept = learner.weakConcepts?.[0] || topicName(learner.currentTopic);
  const difficulty = learner.quizScore < 60 || mastery < 60
    ? 'Easy'
    : learner.currentDifficulty === 'HARD'
      ? 'Hard'
      : 'Medium';

  return {
    challengeTitle: practice.title,
    difficulty,
    targetConcept: weakConcept,
    language: 'Python',
    mistakeFocus: practice.focus,
    estimatedTime: learner.learningSpeed === 'Slow' ? '15 minutes' : learner.learningSpeed === 'Fast' ? '8 minutes' : '10 minutes',
    taskDescription: `${practice.task} Use a ${learner.preferredHobby || 'real-world'} context so the task feels familiar.`,
    expectedOutcome: `Raise ${weakConcept} mastery and reduce ${mistakeProfile.primary} mistakes.`,
  };
};

export const generateRecommendation = (learner) => {
  const mastery = calculateMastery(learner);
  const masteryBand = getMasteryBand(mastery);
  const mistakeProfile = classifyMistakes(learner.codingMistakes);
  const weakPrereq = hasWeakPrerequisite(learner);
  const nextTopic = getNextTopic(learner.currentTopic);
  const crossedGate = learner.quizScore >= 60;

  let recommendedDifficulty = learner.currentDifficulty;
  let recommendedNextModule = topicName(learner.currentTopic);
  let progressStatus = 'Targeted Practice';
  let interventionType = 'targetedRevision';
  let recommendedBossBattle = 'Not yet';

  if (!crossedGate) {
    recommendedDifficulty = learner.learningSpeed === 'Slow' ? 'EASY' : learner.currentDifficulty;
    progressStatus = 'Revision Required';
    interventionType = 'immediateRevision';
  } else if (weakPrereq) {
    recommendedDifficulty = 'EASY';
    recommendedNextModule = `${topicName(weakPrereq)} Revision`;
    progressStatus = 'Prerequisite Support';
    interventionType = 'prerequisiteRevision';
  } else if (mastery >= 80 && learner.learningSpeed === 'Fast') {
    recommendedDifficulty = learner.currentDifficulty === 'HARD' ? 'HARD' : 'HARD';
    recommendedNextModule = topicName(nextTopic);
    progressStatus = 'Promoted';
    interventionType = 'challengeExtension';
    recommendedBossBattle = `Boss Battle: ${topicName(learner.currentTopic)}`;
  } else if (mastery >= 60 && !mistakeProfile.repeated) {
    recommendedDifficulty = learner.currentDifficulty === 'EASY' ? 'MEDIUM' : learner.currentDifficulty === 'MEDIUM' ? 'HARD' : 'HARD';
    recommendedNextModule = topicName(nextTopic);
    progressStatus = 'Ready to Progress';
    interventionType = 'nextModule';
  } else {
    recommendedDifficulty = learner.currentDifficulty;
    progressStatus = 'Targeted Practice';
    interventionType = 'targetedRevision';
  }

  const practice = generatePracticeChallenge(learner, mastery, mistakeProfile);
  const expectedMasteryGain = clamp((learner.scoreAfter - learner.scoreBefore) * 0.55 + (learner.engagementScoreAfter - learner.engagementScoreBefore) * 0.25 + (mistakeProfile.repeated ? 6 : 3), 4, 24);
  const estimatedCompletionTime = learner.learningSpeed === 'Slow' ? '25-30 min' : learner.learningSpeed === 'Fast' ? '12-15 min' : '18-22 min';
  const todayMission = progressStatus === 'Promoted'
    ? `Clear one ${recommendedDifficulty.toLowerCase()} checkpoint and enter ${recommendedBossBattle}.`
    : `Complete ${practice.challengeTitle} before the next checkpoint.`;

  const recommendationReason = !crossedGate
    ? `${learner.name} scored ${learner.quizScore}%, below the existing 60% progression gate, so ALI keeps the learner in revision with ${practice.mistakeFocus}.`
    : weakPrereq
      ? `${learner.name} crossed 60%, but ${topicName(weakPrereq)} is still weak, so ALI recommends prerequisite repair before ${topicName(nextTopic)}.`
      : mastery >= 80
        ? `${learner.name} has ${mastery}% mastery, fast speed, and strong platform signals, so ALI recommends a harder path.`
        : `${learner.name} crossed the 60% gate with ${masteryBand.toLowerCase()} and ${mistakeProfile.primary} as the main coding signal, so ALI assigns targeted practice.`;

  const mentorFeedback = `${learner.name} is strongest in ${(learner.strongConcepts || ['Python basics']).join(', ')}. The main growth area is ${(learner.weakConcepts || ['current topic']).join(', ')}, especially ${mistakeProfile.primary}. Next action: ${practice.challengeTitle}. Reason: score ${learner.quizScore}% and mastery ${mastery}% place the learner in ${progressStatus}. Keep the work focused and the next unlock will feel earned.`;

  return {
    ...learner,
    mastery,
    masteryBand,
    masteryByTopic: {
      ...Object.fromEntries((learner.completedTopics || []).map(topic => [topic, clamp(mastery + 8)])),
      [learner.currentTopic]: mastery,
    },
    mistakeProfile,
    recommendedDifficulty,
    recommendedNextModule,
    personalizedPracticeChallenge: practice,
    recommendedRevision: interventionType.includes('Revision') || progressStatus.includes('Revision')
      ? `${practice.challengeTitle} for ${practice.targetConcept}`
      : 'Scheduled review after next checkpoint',
    recommendedBossBattle,
    expectedMasteryGain,
    estimatedCompletionTime,
    todayMission,
    recommendationReason,
    progressStatus,
    interventionType,
    mentorFeedback,
    difficultyChange: `${learner.currentDifficulty} -> ${recommendedDifficulty}`,
    scoreImprovement: learner.scoreAfter - learner.scoreBefore,
    engagementImprovement: learner.engagementScoreAfter - learner.engagementScoreBefore,
    masteryBefore: clamp(mastery - expectedMasteryGain),
    masteryAfter: clamp(mastery),
    validationType: learner.learnerId?.startsWith('sim-') ? 'simulated' : 'real-user-derived',
  };
};

export const buildLearnerDNA = (learners) => learners.map(generateRecommendation);

export const buildAnalyticsSummary = (profiles) => {
  const promoted = profiles.filter(profile => ['Promoted', 'Ready to Progress'].includes(profile.progressStatus)).length;
  const revision = profiles.filter(profile => profile.progressStatus.includes('Revision') || profile.progressStatus === 'Targeted Practice').length;
  const prereq = profiles.filter(profile => profile.progressStatus === 'Prerequisite Support').length;
  const weakConcepts = profiles.flatMap(profile => profile.weakConcepts || []);
  const mistakes = profiles.flatMap(profile => profile.codingMistakes || []);

  return {
    totalLearners: profiles.length,
    averageScoreBefore: average(profiles.map(profile => profile.scoreBefore)),
    averageScoreAfter: average(profiles.map(profile => profile.scoreAfter)),
    averageScoreImprovement: average(profiles.map(profile => profile.scoreImprovement)),
    averageMasteryGain: average(profiles.map(profile => profile.expectedMasteryGain)),
    averageEngagementBefore: average(profiles.map(profile => profile.engagementScoreBefore)),
    averageEngagementAfter: average(profiles.map(profile => profile.engagementScoreAfter)),
    averageEngagementImprovement: average(profiles.map(profile => profile.engagementImprovement)),
    learnersPromoted: promoted,
    learnersAssignedRevision: revision,
    learnersNeedingPrerequisiteSupport: prereq,
    mostCommonWeakConcept: mode(weakConcepts),
    mostCommonCodingMistake: mode(mistakes),
  };
};

export const buildRecommendationHistory = (profiles) =>
  profiles.map(profile => ({
    id: `${profile.learnerId}-history`,
    learner: profile.name,
    module: profile.recommendedNextModule,
    difficulty: profile.recommendedDifficulty,
    action: profile.progressStatus,
    reason: profile.recommendationReason,
  }));

export const createProfileFromRealProgress = (user, progress = []) => {
  if (!user || !progress.length) return null;
  const sorted = [...progress].sort((a, b) => (a.currentLevel || 1) - (b.currentLevel || 1));
  const current = sorted.find(item => !item.topicCompleted) || sorted[sorted.length - 1];
  const levels = Object.values(current?.levels || {});
  const attempts = levels.reduce((sum, level) => sum + (level?.questionsAttempted || 0), 0);
  const correct = levels.reduce((sum, level) => sum + (level?.correctAnswers || 0), 0);
  const accuracy = attempts ? Math.round((correct / attempts) * 100) : 50;
  const wrongAnswers = current?.wrongAnswers || [];

  return {
    learnerId: user._id || user.id || 'current-user',
    name: `${user.name || 'Current Learner'} (Live)`,
    preferredLanguage: user.language || 'english',
    preferredHobby: user.hobby || 'cricket',
    completedTopics: progress.filter(item => item.topicCompleted).map(item => item.topicId),
    currentTopic: current?.topicId || 'variables',
    currentDifficulty: levels.find(level => level?.currentDifficulty)?.currentDifficulty || 'EASY',
    quizScore: accuracy,
    scoreBefore: clamp(accuracy - 12),
    scoreAfter: accuracy,
    learningSpeed: user.speedModeEnabled ? 'Fast' : 'Average',
    engagementScoreBefore: clamp((user.streak || 0) * 8 + 32),
    engagementScoreAfter: clamp((user.streak || 0) * 8 + 42),
    codingMistakes: wrongAnswers.map(answer => classifyWrongAnswer(answer)).slice(-5),
    weakConcepts: wrongAnswers.map(answer => answer.concept).filter(Boolean).slice(-3),
    strongConcepts: progress.filter(item => item.topicCompleted).map(item => topicName(item.topicId)).slice(-3),
    bossBattlePerformance: current?.topicCompleted ? 75 : 45,
    aiChallengePerformance: current?.aiChallengeCompleted ? current.aiChallengeScore || 80 : 35,
    dailyChallengePerformance: (user.dailyChallengeCompletions || []).length ? 72 : 40,
    revisionHistory: progress.filter(item => item.revisionDue || item.lastRevisionDate).map(item => topicName(item.topicId)),
    profileType: 'Live learner profile from available progress signals',
  };
};

const classifyWrongAnswer = (answer = {}) => {
  const text = `${answer.questionText || ''} ${answer.userAnswer || ''} ${answer.correctAnswer || ''}`.toLowerCase();
  if (text.includes('syntax') || text.includes('indent') || text.includes(':')) return 'syntax error';
  if (text.includes('loop') || text.includes('range') || text.includes('while')) return 'loop condition error';
  if (text.includes('list') || text.includes('index') || text.includes('[')) return 'array indexing error';
  if (text.includes('def') || text.includes('return') || text.includes('function')) return 'function misuse';
  if (text.includes('output') || text.includes('print')) return 'output mismatch';
  return 'logic error';
};
