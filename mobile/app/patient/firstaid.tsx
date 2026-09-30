import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useAppStore } from '../../store/useAppStore';
import { Colors, Radius, Spacing, Shadow } from '../../constants/theme';

interface Step {
  title: string;
  instruction: string;
  illustration: string;
}

const FIRST_AID_STEPS: Record<string, Step[]> = {
  medical: [
    { title: 'Check Responsiveness', instruction: 'Gently shake the shoulders and ask loudly: "Are you okay?". Check if the chest is rising and falling.', illustration: '👁️' },
    { title: 'Clear Airways', instruction: 'Tilt the head back slightly and lift the chin to open the airways. Check for any visible obstructions.', illustration: '🌬️' },
    { title: 'Perform Chest Compressions', instruction: 'If unresponsive, place hands in the center of the chest and push hard and fast: 100-120 compressions per minute.', illustration: '💓' },
  ],
  accident: [
    { title: 'Secure the Scene', instruction: 'Ensure you and the victim are safe from oncoming traffic. Do not move the patient unless there is immediate threat of fire/explosion.', illustration: '🛡️' },
    { title: 'Stabilize Neck and Spine', instruction: 'Keep the head and neck aligned. Avoid turning the victim\'s neck to prevent spinal cord damage.', illustration: '頸' },
    { title: 'Apply Pressure to Wounds', instruction: 'Use clean cloth/bandages to apply direct, firm pressure on bleeding wounds to control blood loss.', illustration: '🩸' },
  ],
  fire: [
    { title: 'Evacuate to Open Air', instruction: 'Get everyone out of the building. Stay low to the ground to avoid inhaling toxic smoke.', illustration: '🏃' },
    { title: 'Stop, Drop, and Roll', instruction: 'If clothing catches fire, drop to the ground immediately, cover your face, and roll back and forth.', illustration: '🔥' },
    { title: 'Cool the Burns', instruction: 'Run cool (not cold) clean water over burns for 10-20 minutes. Do not apply ice, butter, or ointments.', illustration: '💧' },
  ],
  crime: [
    { title: 'Maintain Distance', instruction: 'Move to a safe public location immediately. Do not confront the attacker.', illustration: '🏠' },
    { title: 'Preserve Evidence', instruction: 'Avoid touching items at the crime scene. Document details in your memory.', illustration: '📸' },
    { title: 'Observe and Report', instruction: 'Quietly observe the physical details of suspects and vehicles to report to the dispatch crew.', illustration: '📝' },
  ],
  natural_disaster: [
    { title: 'Drop, Cover, and Hold', instruction: 'Get under a sturdy table, shield your head and neck, and hold on until shaking stops.', illustration: '🏚️' },
    { title: 'Identify Safe Routes', instruction: 'Avoid power lines, glass panels, and weak structural walls. Keep emergency radio alerts active.', illustration: '📻' },
    { title: 'Conserve Water & Power', instruction: 'Turn off leaking gas valves and conserve battery power for emergency signals.', illustration: '🔋' },
  ],
};

export default function FirstAidAssistant() {
  const router = useRouter();
  const { currentEmergency } = useAppStore();
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  const incidentType = currentEmergency?.incidentType || 'medical';
  const steps = FIRST_AID_STEPS[incidentType] || FIRST_AID_STEPS.medical;
  const activeStep = steps[currentStepIndex];

  // Speech synthesis configuration
  const speakText = (text: string) => {
    if (Platform.OS === 'web') {
      const synth = window.speechSynthesis;
      if (synth) {
        synth.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.0;
        synth.speak(utterance);
      }
    } else {
      // Native Speech mock player
      console.log('Voice synthesis:', text);
    }
  };

  const handlePlayPause = () => {
    const nextState = !isPlaying;
    setIsPlaying(nextState);
    if (nextState) {
      speakText(`${activeStep.title}. ${activeStep.instruction}`);
    } else {
      if (Platform.OS === 'web') {
        window.speechSynthesis.cancel();
      }
    }
  };

  const nextStep = () => {
    if (currentStepIndex < steps.length - 1) {
      const nextIndex = currentStepIndex + 1;
      setCurrentStepIndex(nextIndex);
      if (isPlaying) {
        speakText(`${steps[nextIndex].title}. ${steps[nextIndex].instruction}`);
      }
    }
  };

  const prevStep = () => {
    if (currentStepIndex > 0) {
      const prevIndex = currentStepIndex - 1;
      setCurrentStepIndex(prevIndex);
      if (isPlaying) {
        speakText(`${steps[prevIndex].title}. ${steps[prevIndex].instruction}`);
      }
    }
  };

  useEffect(() => {
    return () => {
      if (Platform.OS === 'web') {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.assistantTitle}>🚨 Voice First-Aid Assistant</Text>
      <Text style={styles.assistantSub}>
        Step-by-step guidance tailored for {incidentType.toUpperCase()} incidents.
      </Text>

      {/* Main Step Presentation */}
      <View style={styles.stepCard}>
        <Text style={styles.stepIndex}>STEP {currentStepIndex + 1} OF {steps.length}</Text>
        <Text style={styles.illustration}>{activeStep.illustration}</Text>
        <Text style={styles.stepTitle}>{activeStep.title}</Text>
        <Text style={styles.stepInstruction}>{activeStep.instruction}</Text>
      </View>

      {/* Audio Controller */}
      <View style={styles.audioController}>
        <View style={styles.progressTrack}>
          <View 
            style={[
              styles.progressFill, 
              { width: `${((currentStepIndex + 1) / steps.length) * 100}%` }
            ]} 
          />
        </View>

        <View style={styles.controls}>
          <TouchableOpacity 
            style={[styles.navBtn, currentStepIndex === 0 && styles.disabledBtn]} 
            onPress={prevStep}
            disabled={currentStepIndex === 0}
          >
            <Text style={styles.navBtnText}>⏮️ Prev</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.playBtn} onPress={handlePlayPause}>
            <Text style={styles.playBtnText}>{isPlaying ? '⏸️ PAUSE VOICE' : '▶️ READ STEPS'}</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.navBtn, currentStepIndex === steps.length - 1 && styles.disabledBtn]} 
            onPress={nextStep}
            disabled={currentStepIndex === steps.length - 1}
          >
            <Text style={styles.navBtnText}>Next ⏭️</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Complete Step list */}
      <View style={styles.listContainer}>
        <Text style={styles.sectionTitle}>Overview of all steps</Text>
        {steps.map((step, idx) => (
          <TouchableOpacity
            key={idx}
            style={[styles.listItem, idx === currentStepIndex && styles.listItemActive]}
            onPress={() => {
              setCurrentStepIndex(idx);
              if (isPlaying) speakText(`${step.title}. ${step.instruction}`);
            }}
          >
            <Text style={styles.listItemIcon}>{step.illustration}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.listItemTitle}>{idx + 1}. {step.title}</Text>
              <Text style={styles.listItemSub} numberOfLines={1}>{step.instruction}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  content: {
    padding: Spacing.md,
    gap: Spacing.md,
  },
  assistantTitle: {
    fontSize: 18,
    fontFamily: 'Inter_800ExtraBold',
    color: Colors.textPrimary,
  },
  assistantSub: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
    fontFamily: 'Inter_500Medium',
  },
  stepCard: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    alignItems: 'center',
    ...Shadow.md,
  },
  stepIndex: {
    fontSize: 10,
    fontFamily: 'Inter_800ExtraBold',
    color: Colors.primary,
    letterSpacing: 1,
    marginBottom: Spacing.sm,
  },
  illustration: {
    fontSize: 54,
    marginVertical: Spacing.md,
  },
  stepTitle: {
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  stepInstruction: {
    fontSize: 14,
    color: Colors.textMuted,
    fontFamily: 'Inter_500Medium',
    lineHeight: 22,
    textAlign: 'center',
  },
  audioController: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  progressTrack: {
    height: 4,
    backgroundColor: Colors.surfaceHigh,
    borderRadius: 2,
    marginBottom: Spacing.md,
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.info,
    borderRadius: 2,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  navBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: Colors.glass,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  navBtnText: {
    color: Colors.textPrimary,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
  },
  disabledBtn: {
    opacity: 0.3,
  },
  playBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: Radius.sm,
    ...Shadow.red,
  },
  playBtnText: {
    color: Colors.white,
    fontFamily: 'Inter_700Bold',
    fontSize: 13,
  },
  listContainer: {
    gap: Spacing.sm,
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: 'Inter_700Bold',
    color: Colors.textSubtle,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: Spacing.sm,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: Spacing.sm,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.sm,
  },
  listItemActive: {
    borderColor: Colors.info,
    backgroundColor: Colors.infoGlow,
  },
  listItemIcon: {
    fontSize: 22,
  },
  listItemTitle: {
    color: Colors.textPrimary,
    fontFamily: 'Inter_700Bold',
    fontSize: 13,
  },
  listItemSub: {
    color: Colors.textSubtle,
    fontSize: 11,
    marginTop: 2,
  },
});
