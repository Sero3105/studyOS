import { cn } from '@/lib/utils'
import { Button } from './ui/button'
import { Kbd } from './ui/kbd'
import type { ReviewRating as Rating } from '../services/taskService'
import { useLanguage } from '../i18n/useLanguage'
import type { TranslationKey } from '../i18n/translations'

const ratings: { value: Rating; key: TranslationKey; tone: string }[] = [
  { value: 'hard', key: 'review.hard', tone: 'text-destructive hover:bg-destructive/10 hover:text-destructive' },
  { value: 'ok', key: 'review.ok', tone: '' },
  { value: 'easy', key: 'review.easy', tone: 'text-success hover:bg-success/10 hover:text-success' },
]

/** Com'è andato un ripasso: decide quando arriva il prossimo (usato da ripassi e flashcard). */
function ReviewRating({ onRate, disabled = false, size = 'sm' }: { onRate: (rating: Rating) => void; disabled?: boolean; size?: 'sm' | 'lg' }) {
  const { t } = useLanguage()
  return (
    <span className={cn('inline-flex gap-1.5', size === 'lg' && 'w-full gap-2 [&>*]:flex-1')} role="group" aria-label={t('review.howDidItGo')}>
      {ratings.map(({ value, key, tone }, index) => (
        <Button key={value} variant="outline" size={size === 'lg' ? 'lg' : 'xs'} className={tone} disabled={disabled} onClick={() => onRate(value)}>
          {size === 'lg' && <Kbd>{index + 1}</Kbd>}
          {t(key)}
        </Button>
      ))}
    </span>
  )
}

export default ReviewRating
