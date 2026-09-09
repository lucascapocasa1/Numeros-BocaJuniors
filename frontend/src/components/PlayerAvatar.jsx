export default function PlayerAvatar({ src, alt, className = 'w-10 h-10' }) {
  return (
    <img
      src={src || '/default-avatar.svg'}
      alt={alt}
      className={`${className} rounded-full object-cover flex-shrink-0`}
      onError={(e) => {
        e.currentTarget.onerror = null;
        e.currentTarget.src = '/default-avatar.svg';
      }}
    />
  );
}
