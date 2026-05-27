export interface ProgressInfo {
  completedSteps: number;
  currentStep: number;
  totalSteps: number;
  summary: string;
}

export class ProgressTracker {
  trackProgress(plan: string[], actionHistory: string[]): ProgressInfo {
    if (plan.length === 0) {
      return {
        completedSteps: 0,
        currentStep: 1,
        totalSteps: 0,
        summary: '',
      };
    }

    const actionCount = actionHistory.length;
    const stepEstimate = Math.max(1, Math.ceil(actionCount / 2));
    const completedSteps = Math.max(0, stepEstimate - 1);
    const currentStep = Math.min(stepEstimate, plan.length);

    const summary = this.buildProgressSummary(plan, completedSteps, currentStep);

    return {
      completedSteps,
      currentStep,
      totalSteps: plan.length,
      summary,
    };
  }

  private buildProgressSummary(plan: string[], completed: number, current: number): string {
    const parts: string[] = [];

    // Show completed steps
    for (let i = 0; i < completed && i < plan.length; i++) {
      parts.push(`✓ Step ${i + 1}: ${plan[i]}`);
    }

    // Show current step
    if (current <= plan.length) {
      parts.push(`→ Step ${current}: ${plan[current - 1]}`);
    }

    // Show remaining steps (preview next 1-2)
    for (let i = current; i < Math.min(current + 1, plan.length); i++) {
      if (i !== current - 1) {
        parts.push(`  Step ${i + 1}: ${plan[i]}`);
      }
    }

    return parts.join('\n');
  }
}
