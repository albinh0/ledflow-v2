import packageJson from '../package.json';

export const APP_VERSION = packageJson.version;
export const APP_AUTHOR = 'Danny A.';

export const MAIN_COLORS = [
  '#FF0000', '#006400', '#0000FF', '#FFA500', '#FF00FF', '#00FFFF',
  '#FFFF00', '#800080', '#008000', '#000080', '#800000', '#FF4500',
  '#00FF00', '#FFD700', '#4B0082', '#00CED1'
];

export const DATA_LINE_COLORS = [
  '#000000', '#FF0000', '#006400', '#0000FF', '#FFA500', '#FF00FF', '#00FFFF',
  '#FFFF00', '#800080', '#008000', '#000080', '#800000', '#FF4500',
  '#00FF00', '#FFD700', '#4B0082', '#00CED1', '#FFFFFF'
];

export const GROUP_COLORS = [
  '#0A0A0A', '#141414', '#1E1E1E', '#282828', '#323232',
  '#3C3C3C', '#464646', '#505050', '#5A5A5A', '#646464',
  '#6E6E6E', '#787878', '#828282', '#8C8C8C', '#969696',
  '#A0A0A0', '#AAAAAA', '#B4B4B4', '#BEBEBE', '#C8C8C8',
  '#D2D2D2', '#DCDCDC', '#E6E6E6', '#F0F0F0', '#FAFAFA'
];

export const MODULE_PALETTE_16 = [
  '#0A0A0A', '#1A1A1A', '#2A2A2A', '#3A3A3A',
  '#4A4A4A', '#5A5A5A', '#6A6A6A', '#7A7A7A',
  '#8A8A8A', '#9A9A9A', '#AAAAAA', '#BABABA',
  '#CACACA', '#DADADA', '#EAEAEA', '#FAFAFA'
];

export const MODULE_PALETTE_25 = MODULE_PALETTE_16;

export const COLOR_COMBINATIONS = [
  { fill: '#FAFAFA', label: '#0A0A0A' },  // Snow
  { fill: '#AAAAAA', label: '#0A0A0A' },  // Medium Grey
  { fill: '#EAEAEA', label: '#0A0A0A' },  // Light Grey
  { fill: '#BABABA', label: '#0A0A0A' },  // Soft Grey
  { fill: '#DADADA', label: '#0A0A0A' },  // Cloud Grey
  { fill: '#CACACA', label: '#0A0A0A' }   // Silver Grey
];

export const SCALES = [0.30, 0.40, 0.50, 0.60, 0.70, 0.80, 0.90, 1.00];

export const FONT_OPTIONS = [
  { value: 'Merriweather, serif', label: 'Merriweather' },
  { value: 'Roboto Mono, monospace', label: 'Roboto' },
  { value: 'Orbitron, sans-serif', label: 'Orbitron' },
  { value: 'Space Mono, monospace', label: 'Space' },
  { value: 'Share Tech Mono, monospace', label: 'Share Tech' },
];

export const DEFAULT_ID_FONT = "'JetBrains Mono', monospace";

export const ID_FONT_OPTIONS = [
  { value: "'JetBrains Mono', monospace", label: 'JetBrains', preview: '1.1' },
  { value: 'Arial, sans-serif', label: 'Arial', preview: '1.1' },
  { value: "'VT323', monospace", label: 'VT323', preview: '1.1' },
  { value: "'Orbitron', sans-serif", label: 'Orbitron', preview: '1.1' },
  { value: "'Share Tech Mono', monospace", label: 'Share Tech', preview: '1.1' },
];

export const MAX_HISTORY_STEPS = 10;
export const MODULE_BATCH_TIMEOUT = 5000;
export const HIGHLIGHT_DURATION = 1100;
