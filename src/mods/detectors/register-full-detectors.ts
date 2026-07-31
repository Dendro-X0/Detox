/**
 * Full-build detector chunk. Dynamic import keeps ONNX / Transformers out of the core bundle.
 */
export { localPackProvider } from './local-pack/provider';
export { onnxPackProvider } from './onnx-pack/provider';
export { topicClassifierProvider } from './topic-classifier/provider';
