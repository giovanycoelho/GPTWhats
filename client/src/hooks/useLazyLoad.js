import { useState, useEffect, useRef } from 'react'

export const useLazyLoad = (threshold = 0.1) => {
  const [isIntersecting, setIsIntersecting] = useState(false)
  const [wasIntersecting, setWasIntersecting] = useState(false)
  const ref = useRef()

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsIntersecting(true)
          setWasIntersecting(true)
        } else {
          setIsIntersecting(false)
        }
      },
      { threshold }
    )

    if (ref.current) {
      observer.observe(ref.current)
    }

    return () => {
      if (ref.current) {
        observer.unobserve(ref.current)
      }
    }
  }, [threshold])

  return [ref, isIntersecting, wasIntersecting]
}

export const useLazyImage = (src, placeholder = '') => {
  const [imgSrc, setImgSrc] = useState(placeholder)
  const [imgRef, isIntersecting] = useLazyLoad()

  useEffect(() => {
    if (isIntersecting && src && imgSrc !== src) {
      const img = new Image()
      img.onload = () => setImgSrc(src)
      img.src = src
    }
  }, [isIntersecting, src, imgSrc])

  return [imgRef, imgSrc]
}

export default useLazyLoad