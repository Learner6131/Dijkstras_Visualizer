"use client";
import React from "react";
import { Typography, Divider, Box } from "@mui/material";

function PageTitle() {
  return (
    <Box sx={{ mt: 4, mb: 3, textAlign: "center" }}>
      <Typography
        variant="h3"
        component="h1"
        color="primary"
        sx={{
          fontWeight: "bold",
          letterSpacing: 1,
        }}
      >
        Dijkstra's Algorithm
      </Typography>
      <Divider
        sx={{ mt: 1.5, width: "60%", mx: "auto", borderColor: "primary.main" }}
      />
    </Box>
  );
}

export default PageTitle;
