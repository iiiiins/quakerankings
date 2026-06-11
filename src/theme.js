import { createTheme } from "@mui/material";

// Hybrid redesign theme — fixed visual target: docs/mocks/direction-hybrid.html
// Tokens: warm gunmetal surfaces, ember accent, name-yellow reserved for player identity.

export const EMBER = "#e05a1f";
export const NAME_YELLOW = "#ffff72";

const theme = createTheme({
  palette: {
    mode: "dark",
    primary: { main: EMBER, contrastText: "#0b0a08" },
    secondary: { main: NAME_YELLOW, contrastText: "#0b0a08" },
    background: { default: "#0b0a08", paper: "#14120e" },
    text: { primary: "#ece8df", secondary: "#a39c8d" },
    divider: "#2e2922",
  },
  shape: { borderRadius: 10 },
  typography: {
    fontFamily: "Rajdhani, system-ui, sans-serif",
    fontWeightRegular: 500,
    fontWeightMedium: 600,
    fontWeightBold: 700,
    button: { fontWeight: 700, letterSpacing: "0.12em" },
    h6: { fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", fontSize: "0.78rem", color: EMBER },
    subtitle1: { fontWeight: 600, letterSpacing: "0.1em" },
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: "none",
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          fontSize: "12.5px",
          padding: "7px 18px",
        },
        containedPrimary: {
          background: `linear-gradient(180deg, #ff7a36, ${EMBER})`,
          color: "#0b0a08",
          "&:hover": { background: `linear-gradient(180deg, #ff8a4d, #ef6526)` },
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          color: "#a39c8d",
          "&:hover": { color: EMBER, backgroundColor: "#1b1813" },
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderBottom: "1px solid rgba(255,255,255,0.05)",
          padding: "9px 12px",
          fontSize: "14.5px",
          fontWeight: 600,
          textAlign: "center",
          fontVariantNumeric: "tabular-nums",
        },
        head: {
          background: "linear-gradient(180deg, #221e17, #18150f)",
          fontSize: "11.5px",
          fontWeight: 700,
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          color: "#a39c8d",
          borderBottom: "1px solid #463e32",
          padding: "10px 12px",
          whiteSpace: "nowrap",
        },
        stickyHeader: {
          background: "linear-gradient(180deg, #221e17, #18150f)",
        },
      },
    },
    MuiTableSortLabel: {
      styleOverrides: {
        root: {
          color: "inherit",
          "&:hover": { color: "#ece8df" },
          "&.Mui-active": { color: "inherit" },
        },
        icon: { color: `${EMBER} !important`, fontSize: "0.85rem" },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          backgroundColor: "#1b1813",
          borderRadius: 8,
          fontSize: "14px",
          fontWeight: 600,
          "& .MuiOutlinedInput-notchedOutline": { borderColor: "#2e2922" },
          "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "#463e32" },
          "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: EMBER, borderWidth: 1 },
        },
      },
    },
    MuiInputLabel: {
      styleOverrides: {
        root: {
          fontSize: "13px",
          fontWeight: 600,
          letterSpacing: "0.08em",
          "&.Mui-focused": { color: EMBER },
        },
      },
    },
    MuiSelect: {
      styleOverrides: {
        icon: { color: "#6e6859" },
      },
    },
    MuiSlider: {
      styleOverrides: {
        root: { height: 4 },
        rail: { backgroundColor: "#242019", opacity: 1 },
        track: {
          border: "none",
          boxShadow: "0 0 10px rgba(224,90,31,0.45)",
        },
        thumb: {
          width: 14,
          height: 14,
          backgroundColor: "#ece8df",
          border: "2px solid #0b0a08",
          "&:hover, &.Mui-focusVisible": { boxShadow: "0 0 0 6px rgba(224,90,31,0.16)" },
        },
        valueLabel: {
          backgroundColor: "#242019",
          borderRadius: 6,
          fontWeight: 700,
        },
      },
    },
    MuiCheckbox: {
      styleOverrides: {
        root: {
          color: "#6e6859",
          "&.Mui-checked": { color: EMBER },
        },
      },
    },
    MuiFormControlLabel: {
      styleOverrides: {
        label: { fontSize: "14px", fontWeight: 600, letterSpacing: "0.04em" },
      },
    },
    MuiPopover: {
      styleOverrides: {
        paper: {
          backgroundColor: "#1b1813",
          border: "1px solid #463e32",
          borderRadius: 10,
          boxShadow: "0 14px 40px rgba(0,0,0,0.6)",
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: "#14120e",
          backgroundImage: "none",
          borderTop: "1px solid #463e32",
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 700,
          letterSpacing: "0.06em",
        },
      },
    },
    MuiTypography: {
      styleOverrides: {
        gutterBottom: { marginBottom: "0.45em" },
      },
    },
  },
});

export default theme;
