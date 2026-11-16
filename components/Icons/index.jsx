import Svg, { Path, Circle } from "react-native-svg";
import { colors } from "../../constants/theme";

export const IconPlay = () => {
  return (
    <Svg width="11" height="15" viewBox="0 0 11 15" fill="none">
      <Path
        d="M0.015625 0.473022L10.9844 7.4574L0.015625 14.4418V0.473022Z"
        fill={colors.background}
      />
    </Svg>
  );
};

export const IconPause = () => {
  return (
    <Svg width="12" height="15" viewBox="0 0 12 15" fill="none">
      <Path
        d="M8.01562 0.473022H12V14.4418H8.01562V0.473022ZM0 14.4418V0.473022H3.98438V14.4418H0Z"
        fill={colors.background}
      />
    </Svg>
  );
};

export const IconSave = () => {
  return (
    <Svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <Path
        d="M8 4V1.34375H1.34375V4H8ZM4.59375 10.0625C4.98958 10.4583 5.45833 10.6562 6 10.6562C6.54167 10.6562 7.01042 10.4583 7.40625 10.0625C7.80208 9.66667 8 9.19792 8 8.65625C8 8.11458 7.80208 7.64583 7.40625 7.25C7.01042 6.85417 6.54167 6.65625 6 6.65625C5.45833 6.65625 4.98958 6.85417 4.59375 7.25C4.19792 7.64583 4 8.11458 4 8.65625C4 9.19792 4.19792 9.66667 4.59375 10.0625ZM9.34375 0L12 2.65625V10.6562C12 11.0104 11.8646 11.3229 11.5938 11.5938C11.3229 11.8646 11.0104 12 10.6562 12H1.34375C0.96875 12 0.645833 11.875 0.375 11.625C0.125 11.3542 0 11.0312 0 10.6562V1.34375C0 0.96875 0.125 0.65625 0.375 0.40625C0.645833 0.135417 0.96875 0 1.34375 0H9.34375Z"
        fill={colors.background}
      />
    </Svg>
  );
};

// Desmarcado: só o contorno do círculo. Marcado: círculo cheio com o check
export const IconCheck = ({ checked }) => {
  return (
    <Svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <Circle
        cx="12"
        cy="12"
        r={checked ? 12 : 10.75}
        fill={checked ? colors.success : "none"}
        stroke={checked ? "none" : colors.muted}
        strokeWidth={1.5}
      />
      {checked && (
        <Path
          d="M9 16.1719L19.5938 5.57812L21 6.98438L9 18.9844L3.42188 13.4062L4.82812 12L9 16.1719Z"
          fill={colors.background}
        />
      )}
    </Svg>
  );
};

export const IconTrash = ({ color = colors.background }) => {
  return (
    <Svg width="14" height="18" viewBox="0 0 14 18" fill="none">
      <Path
        d="M13.9844 0.984375V3H0.015625V0.984375H3.48438L4.51562 0H9.48438L10.5156 0.984375H13.9844ZM1 15.9844V3.98438H13V15.9844C13 16.5156 12.7969 16.9844 12.3906 17.3906C11.9844 17.7969 11.5156 18 10.9844 18H3.01562C2.48438 18 2.01562 17.7969 1.60938 17.3906C1.20312 16.9844 1 16.5156 1 15.9844Z"
        fill={color}
      />
    </Svg>
  );
};
