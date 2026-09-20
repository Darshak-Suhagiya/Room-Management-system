import { getDarshanArt } from '../../config/darshanArt'

export function BlessingStamp({
  artKey = 'chrome',
  size = 'md',
  className = '',
}) {
  const art = getDarshanArt(artKey)
  return (
    <img
      className={`blessing-stamp blessing-stamp-${size} ${className}`.trim()}
      src={art.stamp}
      alt=""
      width={80}
      height={80}
      decoding="async"
    />
  )
}
