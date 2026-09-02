// evidence-based workout template evaluation engine linked to science guidelines

import { TemplateExercise, MuscleGroup } from '../types/workout';

export interface EvaluationCategoryScore {
  name: string;
  score: number; // 0 to 25
  maxScore: number;
  status: 'OPTIMAL' | 'MODERATE' | 'SUBOPTIMAL';
  summary: string;
}

export interface RecommendationItem {
  id: string;
  type: 'VOLUME' | 'REST' | 'REPS' | 'ORDER' | 'BALANCE';
  severity: 'WARNING' | 'SUGGESTION' | 'STRENGTH';
  title: string;
  message: string;
  citation?: string;
  exerciseName?: string;
}

export interface TemplateEvaluation {
  overallScore: number; // 0 to 100
  letterGrade: 'S' | 'A' | 'B' | 'C' | 'D';
  gradeLabel: string;
  totalSets: number;
  estimatedMinutes: number;
  muscleVolume: {
    muscle: MuscleGroup | string;
    sets: number;
    status: 'LOW' | 'OPTIMAL' | 'JUNK_VOLUME';
  }[];
  categories: {
    volume: EvaluationCategoryScore;
    rest: EvaluationCategoryScore;
    reps: EvaluationCategoryScore;
    structure: EvaluationCategoryScore;
  };
  strengths: RecommendationItem[];
  improvements: RecommendationItem[];
}

// helper to identify compound vs isolation movement
export function isCompoundMovement(ex: TemplateExercise): boolean {
  const cat = ex.category;
  if (
    cat === 'HORIZONTAL_PUSH' ||
    cat === 'VERTICAL_PUSH' ||
    cat === 'HORIZONTAL_PULL' ||
    cat === 'VERTICAL_PULL' ||
    cat === 'HIP_DOMINANT'
  ) {
    return true;
  }

  const name = (ex.exerciseName || '').toLowerCase();
  const compoundKeywords = [
    'bench',
    'squat',
    'deadlift',
    'press',
    'row',
    'pull-up',
    'chin-up',
    'dip',
    'lunge',
    'split squat',
  ];
  const isIsolationKeyword = [
    'curl',
    'lateral',
    'fly',
    'extension',
    'kickback',
    'raise',
    'crunch',
    'calf',
    'pushdown',
  ].some((kw) => name.includes(kw));

  if (isIsolationKeyword) return false;
  return compoundKeywords.some((kw) => name.includes(kw)) || ex.equipment === 'BARBELL';
}

/**
 * evaluates a template against peer-reviewed resistance training guidelines
 */
export function evaluateTemplate(
  exercises: TemplateExercise[],
  templateName?: string
): TemplateEvaluation {
  if (!exercises || exercises.length === 0) {
    return {
      overallScore: 0,
      letterGrade: 'D',
      gradeLabel: 'Empty Routine',
      totalSets: 0,
      estimatedMinutes: 0,
      muscleVolume: [],
      categories: {
        volume: { name: 'Volume per Muscle', score: 0, maxScore: 25, status: 'SUBOPTIMAL', summary: 'No exercises added yet.' },
        rest: { name: 'Rest Intervals', score: 0, maxScore: 25, status: 'SUBOPTIMAL', summary: 'No rest times configured.' },
        reps: { name: 'Reps & Intensity', score: 0, maxScore: 25, status: 'SUBOPTIMAL', summary: 'No rep targets set.' },
        structure: { name: 'Session Structure', score: 0, maxScore: 25, status: 'SUBOPTIMAL', summary: 'Empty routine.' },
      },
      strengths: [],
      improvements: [
        {
          id: 'imp_empty',
          type: 'BALANCE',
          severity: 'WARNING',
          title: 'Add Exercises',
          message: 'Add exercises to this workout to view evidence-based analysis and science-backed recommendations.',
        },
      ],
    };
  }

  const strengths: RecommendationItem[] = [];
  const improvements: RecommendationItem[] = [];

  // calculate total sets and volume by muscle
  let totalSets = 0;
  const muscleMap = new Map<string, number>();

  exercises.forEach((ex) => {
    const sets = Math.max(1, ex.targetSets || 3);
    totalSets += sets;
    const muscle = (ex.primaryMuscle || 'OTHER').toUpperCase();
    muscleMap.set(muscle, (muscleMap.get(muscle) || 0) + sets);
  });

  // 1. evaluate volume per muscle (max 25 pts)
  // research: Heaselgrave et al. (2019) & Schoenfeld et al. (2017)
  let volumeScore = 25;
  const muscleVolumeResult: TemplateEvaluation['muscleVolume'] = [];

  muscleMap.forEach((sets, muscle) => {
    if (muscle === 'OTHER') return;
    if (sets > 10) {
      // junk volume threshold
      muscleVolumeResult.push({ muscle, sets, status: 'JUNK_VOLUME' });
      const penalty = Math.min(6, (sets - 10) * 2);
      volumeScore = Math.max(8, volumeScore - penalty);
      improvements.push({
        id: `vol_${muscle}`,
        type: 'VOLUME',
        severity: 'WARNING',
        title: `High Session Volume on ${muscle} (${sets} sets)`,
        message: `Recent research demonstrates diminishing returns and "junk volume" beyond ~8-10 sets per muscle in a single workout due to local fatigue. Consider capping ${muscle} at 8-10 sets and shifting extra sets to a second weekly session.`,
        citation: 'Robinson, Pelland et al. (2023) / Heaselgrave et al. (2019)',
      });
    } else if (sets >= 4 && sets <= 10) {
      muscleVolumeResult.push({ muscle, sets, status: 'OPTIMAL' });
      strengths.push({
        id: `str_vol_${muscle}`,
        type: 'VOLUME',
        severity: 'STRENGTH',
        title: `Optimal ${muscle} Volume`,
        message: `${sets} sets provides a robust hypertrophic stimulus without entering the junk volume zone.`,
        citation: 'Pelland, Wolf, Schoenfeld et al., Sports Med (2024)',
      });
    } else {
      muscleVolumeResult.push({ muscle, sets, status: 'LOW' });
    }
  });

  // total session length penalty if excessive
  if (totalSets > 26) {
    volumeScore = Math.max(8, volumeScore - 4);
    improvements.push({
      id: 'vol_total_high',
      type: 'VOLUME',
      severity: 'WARNING',
      title: `Long Session (${totalSets} total sets)`,
      message: `Workouts with over 24-26 total hard sets often exceed 75-90 minutes, leading to elevated central fatigue and reduced mechanical tension toward the end of the session.`,
      citation: 'Israetel & Schoenfeld Volume Landmarks',
    });
  } else if (totalSets >= 12 && totalSets <= 22) {
    strengths.push({
      id: 'str_total_vol',
      type: 'VOLUME',
      severity: 'STRENGTH',
      title: 'Ideal Workout Density',
      message: `${totalSets} total sets is the scientific sweet spot for an effective 45-65 minute training session.`,
    });
  }

  // 2. evaluate rest intervals (max 25 pts)
  // research: Schoenfeld et al. (2016) - 3 min vs 1 min on compounds
  let restScore = 25;
  let compoundCount = 0;
  let optimalCompoundRestCount = 0;

  exercises.forEach((ex) => {
    const isComp = isCompoundMovement(ex);
    const rest = ex.restBetweenSetsSeconds ?? 120;

    if (isComp) {
      compoundCount++;
      if (rest >= 120) {
        optimalCompoundRestCount++;
      } else {
        const penalty = rest < 60 ? 5 : 3;
        restScore = Math.max(6, restScore - penalty);
        improvements.push({
          id: `rest_${ex.exerciseId}`,
          type: 'REST',
          severity: 'WARNING',
          exerciseName: ex.exerciseName,
          title: `Short Rest on Compound: ${ex.exerciseName}`,
          message: `Rest interval is set to ${rest}s. A landmark randomized trial by Dr. Brad Schoenfeld showed that 3-minute rest periods produced superior muscle thickness and strength compared to 1-minute rest by preserving volume load. We recommend 120s to 180s for heavy multi-joint lifts.`,
          citation: 'Longo et al., Eur J Sport Sci (2022) / Schoenfeld et al. (2016)',
        });
      }
    } else {
      // isolation
      if (rest < 45) {
        restScore = Math.max(10, restScore - 2);
        improvements.push({
          id: `rest_${ex.exerciseId}`,
          type: 'REST',
          severity: 'SUGGESTION',
          exerciseName: ex.exerciseName,
          title: `Very Short Rest: ${ex.exerciseName}`,
          message: `${rest}s may be too short for local metabolic clearance. 60-90s is the evidence-based benchmark for single-joint isolations.`,
        });
      } else if (rest > 180) {
        improvements.push({
          id: `rest_long_${ex.exerciseId}`,
          type: 'REST',
          severity: 'SUGGESTION',
          exerciseName: ex.exerciseName,
          title: `Long Isolation Rest: ${ex.exerciseName}`,
          message: `Rest is set to ${rest}s. Isolations typically recover fully within 60-90s, so you could save session time by trimming this rest interval.`,
        });
      }
    }
  });

  if (compoundCount > 0 && optimalCompoundRestCount === compoundCount) {
    strengths.push({
      id: 'str_rest_comp',
      type: 'REST',
      severity: 'STRENGTH',
      title: 'Science-Backed Rest on Compounds',
      message: 'All multi-joint compound exercises have 120s+ rest, allowing adequate phosphocreatine and central nervous recovery.',
      citation: 'Longo et al. (2022) & Schoenfeld et al. (2016)',
    });
  }

  // 3. evaluate reps and intensity (max 25 pts)
  // research: Refalo et al. (2023) & Baz-Valle et al. (2022)
  let repsScore = 25;
  let lowRepCount = 0;
  let veryHighRepCount = 0;

  exercises.forEach((ex) => {
    const targetReps = ex.targetReps ?? ex.repMax ?? ex.repMin ?? 10;
    if (targetReps < 5) {
      lowRepCount++;
    } else if (targetReps > 25) {
      veryHighRepCount++;
    }
  });

  if (lowRepCount > 1) {
    repsScore = Math.max(12, repsScore - 4);
    improvements.push({
      id: 'rep_low',
      type: 'REPS',
      severity: 'SUGGESTION',
      title: 'Low Rep Range Focus (< 5 reps)',
      message: 'Heavy low-rep sets (< 5 reps) are exceptional for maximal neurological strength peaking, but 6-15 reps generally achieves greater hypertrophic stimulus per unit of joint fatigue.',
      citation: 'Refalo, Helms et al., Sports Med (2023)',
    });
  }

  if (veryHighRepCount > 1) {
    repsScore = Math.max(14, repsScore - 3);
    improvements.push({
      id: 'rep_high',
      type: 'REPS',
      severity: 'SUGGESTION',
      title: 'High Rep Range Sets (> 25 reps)',
      message: 'Sets above 25 reps often trigger premature cardiovascular fatigue and discomfort before true muscular failure is reached. Consider keeping most sets between 6 and 20 reps.',
    });
  }

  if (lowRepCount === 0 && veryHighRepCount === 0) {
    strengths.push({
      id: 'str_reps_hyper',
      type: 'REPS',
      severity: 'STRENGTH',
      title: 'Hypertrophy Rep Range (6-20 reps)',
      message: 'All exercises sit cleanly within the optimal 6-20 rep hypertrophy spectrum.',
      citation: 'Refalo et al. (2023) & Schoenfeld et al. (2021)',
    });
  }

  // 4. evaluate structure and exercise ordering (max 25 pts)
  // research: Nunes et al. (2021) & Simão et al. (2012)
  let structureScore = 25;
  let foundIsolationFirst = false;

  for (let i = 0; i < exercises.length; i++) {
    const current = exercises[i];
    const isComp = isCompoundMovement(current);

    if (!isComp) {
      foundIsolationFirst = true;
    } else if (foundIsolationFirst && isComp) {
      // compound after isolation
      structureScore = Math.max(12, structureScore - 4);
      improvements.push({
        id: `ord_${current.exerciseId}`,
        type: 'ORDER',
        severity: 'SUGGESTION',
        exerciseName: current.exerciseName,
        title: `Compound Lift Ordered Later: ${current.exerciseName}`,
        message: `Compound movements require greater neuromuscular coordination and stabilizer recruitment. Research recommends placing heavy compounds early in the workout before pre-fatiguing with isolations.`,
        citation: 'Nunes, Schoenfeld et al. (2021) / Simão et al. (2012)',
      });
      break;
    }
  }

  if (!foundIsolationFirst || compoundCount === 0) {
    strengths.push({
      id: 'str_order',
      type: 'ORDER',
      severity: 'STRENGTH',
      title: 'Compound-First Ordering',
      message: 'Heavy multi-joint lifts are prioritized while physical and mental energy is peak.',
    });
  }

  // compute total overall score
  const rawScore = volumeScore + restScore + repsScore + structureScore;
  const overallScore = Math.min(100, Math.max(10, Math.round(rawScore)));

  // assign letter grade
  let letterGrade: TemplateEvaluation['letterGrade'] = 'A';
  let gradeLabel = 'Great Evidence-Based Routine';

  if (overallScore >= 92) {
    letterGrade = 'S';
    gradeLabel = 'Science-Backed Masterpiece 🔥';
  } else if (overallScore >= 82) {
    letterGrade = 'A';
    gradeLabel = 'Solid Evidence-Based Routine 💪';
  } else if (overallScore >= 72) {
    letterGrade = 'B';
    gradeLabel = 'Good with Minor Optimization Potential';
  } else if (overallScore >= 60) {
    letterGrade = 'C';
    gradeLabel = 'Needs Tuning (Volume / Rest Imbalances)';
  } else {
    letterGrade = 'D';
    gradeLabel = 'Suboptimal (High Junk Volume or Very Short Rest)';
  }

  // estimate workout minutes based on rest + set execution (45s per set)
  let estimatedSeconds = 0;
  exercises.forEach((ex) => {
    const sets = Math.max(1, ex.targetSets || 3);
    const setRest = ex.restBetweenSetsSeconds ?? 120;
    const exRest = ex.restAfterExerciseSeconds ?? 120;
    estimatedSeconds += sets * 45; // 45s execution
    estimatedSeconds += Math.max(0, sets - 1) * setRest;
    estimatedSeconds += exRest;
  });
  const estimatedMinutes = Math.max(15, Math.round(estimatedSeconds / 60));

  return {
    overallScore,
    letterGrade,
    gradeLabel,
    totalSets,
    estimatedMinutes,
    muscleVolume: muscleVolumeResult,
    categories: {
      volume: {
        name: 'Volume per Muscle',
        score: volumeScore,
        maxScore: 25,
        status: volumeScore >= 20 ? 'OPTIMAL' : volumeScore >= 15 ? 'MODERATE' : 'SUBOPTIMAL',
        summary: `${totalSets} sets across ${muscleMap.size} muscle groups`,
      },
      rest: {
        name: 'Rest Intervals',
        score: restScore,
        maxScore: 25,
        status: restScore >= 20 ? 'OPTIMAL' : restScore >= 15 ? 'MODERATE' : 'SUBOPTIMAL',
        summary: `${optimalCompoundRestCount}/${compoundCount || 1} compound lifts with adequate rest`,
      },
      reps: {
        name: 'Reps & Intensity',
        score: repsScore,
        maxScore: 25,
        status: repsScore >= 20 ? 'OPTIMAL' : repsScore >= 15 ? 'MODERATE' : 'SUBOPTIMAL',
        summary: 'Proximity to failure & target hypertrophy rep ranges',
      },
      structure: {
        name: 'Exercise Ordering',
        score: structureScore,
        maxScore: 25,
        status: structureScore >= 20 ? 'OPTIMAL' : structureScore >= 15 ? 'MODERATE' : 'SUBOPTIMAL',
        summary: 'Compound prioritization & fatigue management',
      },
    },
    strengths,
    improvements,
  };
}
