'use client'

import { TutorialOverlay } from './tutorial-overlay'
import { useTutorial } from './use-tutorial'

/**
 * 新手引導 Provider — 放在 MainLayout 裡
 */
export function TutorialProvider() {
  const { currentStep, stepNumber, totalSteps, completeCurrentStep, dismiss } = useTutorial()

  if (!currentStep) return null

  return (
    <TutorialOverlay
      step={currentStep}
      stepNumber={stepNumber}
      totalSteps={totalSteps}
      onNext={completeCurrentStep}
      onSkip={completeCurrentStep}
      onDismiss={dismiss}
    />
  )
}
