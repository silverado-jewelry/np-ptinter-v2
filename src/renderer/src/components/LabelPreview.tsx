import type { JSX } from 'react'
import type { LabelSize } from '@shared/types'

interface LabelPreviewProps {
  pngDataUrl: string
  label: LabelSize
}

const PREVIEW_WIDTH_PX = 360

/** Превʼю з пропорціями реальної етикетки; всередині — той самий PNG, що піде на друк. */
export function LabelPreview({ pngDataUrl, label }: LabelPreviewProps): JSX.Element {
  return (
    <div className="preview-wrap">
      <div
        className="preview-label"
        style={{ width: PREVIEW_WIDTH_PX, height: (PREVIEW_WIDTH_PX * label.height) / label.width }}
      >
        <img src={pngDataUrl} alt="Штрих-код Code 128" />
      </div>
      <div className="preview-caption">
        Етикетка {label.width}×{label.height} мм
      </div>
    </div>
  )
}
