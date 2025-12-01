import { useLayoutEffect, useState, useMemo } from "react"
import { Platform, PixelRatio } from "react-native"
import { Image, ImageProps, ImageSource } from "expo-image"

export interface AutoImageProps extends Omit<ImageProps, "source"> {
  /**
   * How wide should the image be?
   */
  maxWidth?: number
  /**
   * How tall should the image be?
   */
  maxHeight?: number
  /**
   * Image source (compatible with both expo-image and react-native Image)
   */
  source?: ImageSource | { uri?: string; headers?: { [key: string]: string } } | number
  headers?: {
    [key: string]: string
  }
}

/**
 * A hook that will return the scaled dimensions of an image based on the
 * provided dimensions' aspect ratio. If no desired dimensions are provided,
 * it will return the original dimensions of the remote image.
 *
 * How is this different from `resizeMode: 'contain'`? Firstly, you can
 * specify only one side's size (not both). Secondly, the image will scale to fit
 * the desired dimensions instead of just being contained within its image-container.
 * @param {number} remoteUri - The URI of the remote image.
 * @param {number} dimensions - The desired dimensions of the image. If not provided, the original dimensions will be returned.
 * @returns {[number, number]} - The scaled dimensions of the image.
 */
export function useAutoImage(
  remoteUri: string,
  headers?: {
    [key: string]: string
  },
  dimensions?: [maxWidth?: number, maxHeight?: number],
): [width: number, height: number] {
  const [[remoteWidth, remoteHeight], setRemoteImageDimensions] = useState([0, 0])
  const remoteAspectRatio = remoteWidth / remoteHeight
  const [maxWidth, maxHeight] = dimensions ?? []

  useLayoutEffect(() => {
    if (!remoteUri) return

    // expo-image uses a different API - we'll use Image.getSize for compatibility
    // but expo-image handles sizing better automatically
    const RNImage = require("react-native").Image
    if (!headers) {
      RNImage.getSize(remoteUri, (w: number, h: number) => setRemoteImageDimensions([w, h]))
    } else {
      RNImage.getSizeWithHeaders(remoteUri, headers, (w: number, h: number) =>
        setRemoteImageDimensions([w, h]),
      )
    }
  }, [remoteUri, headers])

  if (Number.isNaN(remoteAspectRatio) || remoteAspectRatio === 0) return [0, 0]

  if (maxWidth && maxHeight) {
    const aspectRatio = Math.min(maxWidth / remoteWidth, maxHeight / remoteHeight)
    return [
      PixelRatio.roundToNearestPixel(remoteWidth * aspectRatio),
      PixelRatio.roundToNearestPixel(remoteHeight * aspectRatio),
    ]
  } else if (maxWidth) {
    return [maxWidth, PixelRatio.roundToNearestPixel(maxWidth / remoteAspectRatio)]
  } else if (maxHeight) {
    return [PixelRatio.roundToNearestPixel(maxHeight * remoteAspectRatio), maxHeight]
  } else {
    return [remoteWidth, remoteHeight]
  }
}

/**
 * An Image component that automatically sizes a remote or data-uri image.
 * @see [Documentation and Examples]{@link https://docs.infinite.red/ignite-cli/boilerplate/app/components/AutoImage/}
 * @param {AutoImageProps} props - The props for the `AutoImage` component.
 * @returns {JSX.Element} The rendered `AutoImage` component.
 */
export function AutoImage(props: AutoImageProps) {
  const { maxWidth, maxHeight, source, headers, ...ImageProps } = props

  // Handle different source formats (expo-image, react-native Image, or number for local assets)
  const imageSource = useMemo(() => {
    if (typeof source === "number") {
      // Local asset (require())
      return source
    }
    if (typeof source === "string") {
      // String URI
      return { uri: source, headers }
    }
    if (source && typeof source === "object") {
      // Object with uri or ImageSource
      if ("uri" in source) {
        return { uri: source.uri, headers: source.headers || headers }
      }
      return source
    }
    return source
  }, [source, headers])

  const remoteUri =
    typeof imageSource === "object" && "uri" in imageSource
      ? imageSource.uri
      : typeof source === "string"
        ? source
        : ""

  const [width, height] = useAutoImage(
    remoteUri || "",
    headers ||
      (typeof imageSource === "object" && "headers" in imageSource
        ? imageSource.headers
        : undefined),
    [maxWidth, maxHeight],
  )

  // Use expo-image with optimized props
  return (
    <Image
      {...ImageProps}
      source={imageSource}
      style={[{ width, height }, props.style]}
      contentFit="contain"
      transition={200}
      cachePolicy="memory-disk"
    />
  )
}
