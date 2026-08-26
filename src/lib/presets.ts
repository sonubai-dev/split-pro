import { EditorSettings, SplitMode } from '../types';

export interface CreatorPreset {
  id: string;
  name: string;
  category: 'social' | 'creative' | 'web' | 'standard';
  description: string;
  iconName: string;
  settings: Partial<EditorSettings>;
}

export const CREATOR_PRESETS: CreatorPreset[] = [
  {
    id: 'instagram-grid-3x3',
    name: 'Instagram 3×3 Grid',
    category: 'social',
    description: 'Transform a full image into a 9-post profile mosaic.',
    iconName: 'Grid3x3',
    settings: {
      splitMode: 'grid' as SplitMode,
      rows: 3,
      columns: 3,
      panelOrder: 'row-by-row',
      outputFormat: 'jpeg',
      quality: 95,
      outerMargin: 0,
      horizontalGap: 0,
      verticalGap: 0,
    },
  },
  {
    id: 'instagram-carousel-3',
    name: 'Instagram Carousel (3 Slices)',
    category: 'social',
    description: '3 seamless swipeable vertical panels for panoramic posts.',
    iconName: 'Columns3',
    settings: {
      splitMode: 'vertical' as SplitMode,
      verticalCount: 3,
      panelOrder: 'row-by-row',
      outputFormat: 'jpeg',
      quality: 95,
    },
  },
  {
    id: 'instagram-carousel-5',
    name: 'Instagram Carousel (5 Slices)',
    category: 'social',
    description: '5 seamless panorama slides for detailed storytelling.',
    iconName: 'Columns4',
    settings: {
      splitMode: 'vertical' as SplitMode,
      verticalCount: 5,
      panelOrder: 'row-by-row',
      outputFormat: 'jpeg',
      quality: 95,
    },
  },
  {
    id: 'instagram-carousel-10',
    name: 'Max 10-Slide Panorama',
    category: 'social',
    description: 'Full 10-slide continuous panorama carousel.',
    iconName: 'LayoutGrid',
    settings: {
      splitMode: 'vertical' as SplitMode,
      verticalCount: 10,
      panelOrder: 'row-by-row',
      outputFormat: 'jpeg',
      quality: 95,
    },
  },
  {
    id: 'pinterest-pins',
    name: 'Pinterest 3-Pin Stack',
    category: 'social',
    description: '3 tall vertical pins stacked horizontally.',
    iconName: 'Rows3',
    settings: {
      splitMode: 'horizontal' as SplitMode,
      horizontalCount: 3,
      panelOrder: 'row-by-row',
      outputFormat: 'png',
    },
  },
  {
    id: 'symmetry-quadrant',
    name: '2×2 Symmetry Quadrant',
    category: 'standard',
    description: '4 balanced equal panels for comparisons or multi-cards.',
    iconName: 'Grid2x2',
    settings: {
      splitMode: 'grid' as SplitMode,
      rows: 2,
      columns: 2,
      panelOrder: 'row-by-row',
    },
  },
  {
    id: 'web-banner-4',
    name: 'Website 4-Column Feature',
    category: 'web',
    description: '4 vertical columns for landing page showcases & hero ribbons.',
    iconName: 'Columns4',
    settings: {
      splitMode: 'vertical' as SplitMode,
      verticalCount: 4,
      panelOrder: 'row-by-row',
    },
  },
  {
    id: 'mosaic-4x4',
    name: '4×4 Mosaic Grid (16 Panels)',
    category: 'creative',
    description: '16 high-resolution micro panels for complex displays.',
    iconName: 'Grid',
    settings: {
      splitMode: 'grid' as SplitMode,
      rows: 4,
      columns: 4,
      panelOrder: 'row-by-row',
    },
  },
];
