import type { ReviewRating as Rating } from '../services/taskService'
import { useLanguage } from '../i18n/useLanguage'
import type { TranslationKey } from '../i18n/translations'

const ratings: { value: Rating; key: TranslationKey; tone: string }[] = [
  { value: 'hard', key: 'review.hard', tone: ' tag-danger' },
  { value: 'ok', key: 'review.ok', tone: '' },
  { value: 'easy', key: 'review.easy', tone: ' tag-success' },
]

/** Com'è andato un ripasso: decide quando arriva il prossimo (usato da ripassi e flashcard). */
function ReviewRating({ onRate, disabled = false, size = 'sm' }: { onRate: (rating: Rating) => void; disabled?: boolean; size?: 'sm' | 'lg' }) {
  const { t } = useLanguage()
  return (
    <span className={`review-rating is-${size}`} role="group" aria-label={t('review.howDidItGo')}>
      {ratings.map(({ value, key, tone }) => (
        <button key={value} className={`tag tag-button${tone}`} type="button" disabled={disabled} onClick={() => onRate(value)}>
          {size === 'lg' && <kbd className="review-key">{ratings.findIndex((r) => r.value === value) + 1}</kbd>}
          {t(key)}
        </button>
      ))}
    </span>
  )
}

export default ReviewRating
