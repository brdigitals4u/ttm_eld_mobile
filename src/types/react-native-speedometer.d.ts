declare module "react-native-speedometer" {
  import { Component } from "react"
  import { ViewStyle, TextStyle } from "react-native"

  export interface SpeedometerLabel {
    name: string
    labelColor: string
    activeBarColor: string
  }

  export interface RNSpeedometerProps {
    value: number
    minValue?: number
    maxValue?: number
    size?: number
    labels?: SpeedometerLabel[]
    valueFormatter?: (value: number) => string
    innerCircleStyle?: ViewStyle
    outerCircleStyle?: ViewStyle
    labelStyle?: TextStyle
    showLabels?: boolean
    angle?: number
    sweepAngle?: number
    width?: number
  }

  export default class RNSpeedometer extends Component<RNSpeedometerProps> {}
}











