import React from 'react'
import { useLazyImage } from '../hooks/useLazyLoad'

const LazyImage = ({ 
  src, 
  alt, 
  className = '', 
  placeholder = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect width="100" height="100" fill="%23f3f4f6"/%3E%3C/svg%3E',
  ...props 
}) => {
  const [imgRef, imgSrc] = useLazyImage(src, placeholder)

  return (
    <div ref={imgRef} className={`overflow-hidden ${className}`}>
      <img
        src={imgSrc}
        alt={alt}
        className={`w-full h-full object-cover transition-opacity duration-300 ${
          imgSrc === placeholder ? 'opacity-50' : 'opacity-100'
        }`}
        {...props}
      />
    </div>
  )
}

export default LazyImage