import React from 'react';

export interface WebBarcodeScannerProps {
  mode: 'barcode' | 'photo';
  onBarcodeDetected?: (code: string, capturedFrameBase64?: string) => void;
  onPhotoCaptured?: (uri: string) => void;
  onError?: (message: string) => void;
}

export function WebBarcodeScanner(_props: WebBarcodeScannerProps) {
  return null;
}
