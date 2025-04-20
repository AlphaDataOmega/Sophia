import React, { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { PhonemeService } from '../services/PhonemeService';

// Test phonemes that match our available blend shapes
const TEST_PHONEMES = [
  'viseme_sil',  // Silence
  'viseme_PP',   // P, B, M
  'viseme_FF',   // F, V
  'viseme_TH',   // TH, DH
  'viseme_DD',   // D, T
  'viseme_kk',   // K, G
  'viseme_CH',   // CH, JH
  'viseme_SS',   // S, Z, SH
  'viseme_nn',   // N, NG
  'viseme_RR',   // R, L
  'viseme_aa',   // AA, AE, AH
  'viseme_E',    // EH, EY
  'viseme_I',    // IH, IY
  'viseme_O',    // AO, AW, OW
  'viseme_U'     // UH, UW
];

export function MorphTest() {
  const phonemeService = useRef(PhonemeService.getInstance());
  const currentIndex = useRef(0);

  useEffect(() => {
    console.log('Starting MorphTest...');
    phonemeService.current.startProcessing();
    
    const interval = setInterval(() => {
      const phoneme = TEST_PHONEMES[currentIndex.current];
      console.log('Testing phoneme:', phoneme);
      
      try {
        phonemeService.current.processPhoneme(phoneme);
        console.log('Successfully processed phoneme:', phoneme);
      } catch (error) {
        console.error('Error processing phoneme:', error);
      }
      
      currentIndex.current = (currentIndex.current + 1) % TEST_PHONEMES.length;
    }, 1000);

    return () => {
      console.log('Cleaning up MorphTest...');
      clearInterval(interval);
      phonemeService.current.stopProcessing();
    };
  }, []);

  useFrame((_state, delta) => {
    try {
      phonemeService.current.update(delta);
    } catch (error) {
      console.error('Error in useFrame update:', error);
    }
  });

  return null;
} 