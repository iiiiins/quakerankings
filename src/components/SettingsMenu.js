import React from "react";
import {
  Typography,
  Box,
  Button,
  TextField,
  FormControlLabel,
  Checkbox,
  Divider,
} from "@mui/material";

const SettingsMenu = ({
  pointsConfig,
  setPointsConfig,
  pointsVisibility,
  setPointsVisibility,
  gameWeights,
  setGameWeights,
  gameVisibility,
  setGameVisibility,
  tierWeights,
  setTierWeights,
  tierVisibility,
  setTierVisibility,
  modeWeights,
  setModeWeights,
  modeVisibility,
  setModeVisibility,

}) => {
  const handlePointsChange = (placement, value) => {
    //console.log(`Updating pointsConfig for ${placement}:`, value);
    //console.log(`Updating pointsConfig for ${placement}:`, pointsConfig);
    setPointsConfig((prev) => ({
      ...prev,
      [placement]: parseInt(value, 10) || 0,
    }));
  };

  const handlePointsVisibilityChange = (placement) => {
    //console.log(`Updating pointsVisibility for ${placement}:`, pointsVisibility);
    setPointsVisibility((prev) => ({
      ...prev,
      [placement]: !prev[placement],
    }));
  };

  const handleGameWeightChange = (game, value) => {
    //console.log(`Updating gameWeights for ${game}:`, value);
    setGameWeights((prev) => ({
      ...prev,
      [game]: parseInt(value, 10) || 0,
    }));
  };

  const handleGameVisibilityChange = (game) => {
    setGameVisibility((prev) => ({
      ...prev,
      [game]: !prev[game],
    }));
  };

  const handleTierWeightChange = (tier, value) => {
    //console.log(`Updating tierWeight for ${tier}:`, value);
    setTierWeights((prev) => ({
      ...prev,
      [tier]: parseInt(value, 10) || 0,
    }));
  };

  const handleTierVisibilityChange = (tier) => {
    setTierVisibility((prev) => ({
      ...prev,
      [tier]: !prev[tier],
    }));
  };

  const handleModeWeightChange = (mode, value) => {
    //console.log(`Updating modeWeights for ${mode}:`, value);
    setModeWeights((prev) => ({
      ...prev,
      [mode]: parseInt(value, 10) || 0,
    }));
  };

  const handleModeVisibilityChange = (mode) => {
    setModeVisibility((prev) => ({
      ...prev,
      [mode]: !prev[mode],
    }));
  };

  return (
    <Box className="settings-box" padding="16px">
      {/* Points Configuration */}
      <Typography variant="h6" gutterBottom>
        Points Configuration
      </Typography>
      {["first", "second", "top4", "top8"].map((placement) => (
        <Box
          className="settings-boxes"
          key={placement}
          display="flex"
          alignItems="center"
          mb={0}
        >
          <FormControlLabel
            control={
              <Checkbox
                size="small"
                checked={pointsVisibility[placement]}
                onChange={() => handlePointsVisibilityChange(placement)}
              />
            }
            label={placement.toUpperCase()}
          />
          {pointsVisibility[placement] && (
            <TextField
              type="number"
              size="small"
              value={pointsConfig[placement]}
              onChange={(e) => handlePointsChange(placement, e.target.value)}
              style={{ marginLeft: "10px", width: "78px" }}
            />
          )}
        </Box>
      ))}
      <Divider style={{ margin: "10px 0" }} />

      {/* Games Configuration */}
      <Typography variant="h6" gutterBottom>
        Games Configuration
      </Typography>
      {Object.keys(gameWeights).map((game) => (
        <Box
          className="settings-boxes"
          key={game}
          display="flex"
          alignItems="center"
          mb={0}
        >
          <FormControlLabel
            control={
              <Checkbox
                size="small"
                checked={gameVisibility[game]}
                onChange={() => handleGameVisibilityChange(game)}
              />
            }
            label={game}
          />
          {gameVisibility[game] && (
            <TextField
              type="number"
              size="small"
              value={gameWeights[game]}
              onChange={(e) => handleGameWeightChange(game, e.target.value)}
              style={{ marginLeft: "10px", width: "78px" }}
            />
          )}
        </Box>
      ))}
      <Divider style={{ margin: "10px 0" }} />

      {/* Tier Configuration */}
      <Typography variant="h6" gutterBottom>
        Tier Configuration
      </Typography>
      {Object.keys(tierWeights).map((tier) => (
        <Box
          className="settings-boxes"
          key={tier}
          display="flex"
          alignItems="center"
          mb={0}
        >
          <FormControlLabel
            control={
              <Checkbox
                size="small"
                checked={tierVisibility[tier]}
                onChange={() => handleTierVisibilityChange(tier)}
              />
            }
            label={`Tier ${tier}`}
          />
          {tierVisibility[tier] && (
            <TextField
              type="number"
              size="small"
              value={tierWeights[tier]}
              onChange={(e) => handleTierWeightChange(tier, e.target.value)}
              style={{ marginLeft: "10px", width: "78px" }}
            />
          )}
        </Box>
      ))}
        {/* Mode Configuration */}
        <Typography variant="h6" gutterBottom>
        Mode Configuration
        </Typography>
        {Object.keys(modeWeights).map((mode) => (
        <Box
          className="settings-boxes"
          key={mode}
          display="flex"
          alignItems="center"
          mb={0}
        >
          <FormControlLabel
            control={
              <Checkbox
                size="small"
                checked={modeVisibility[mode]}
                onChange={() => handleModeVisibilityChange(mode)}
              />
            }
            label={`Mode ${mode}`}
          />
          {modeVisibility[mode] && (
            <TextField
              type="number"
              size="small"
              value={modeWeights[mode]}
              onChange={(e) => handleModeWeightChange(mode, e.target.value)}
              style={{ marginLeft: "10px", width: "78px" }}
            />
          )}
        </Box>
      ))}
    </Box>
  );
};

export default SettingsMenu;
