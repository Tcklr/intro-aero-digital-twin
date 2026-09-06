import {
  analyzeTrimResponse,
  pitchingMomentCoefficient,
  disturbanceMomentCoefficientChange
} from "../physics/trim-response.js";

const REQUIRED_CAPABILITY = {
  id: "loads.pitch.component-sum",
  version: 1
};

function hasRequiredCapability(capabilities) {
  if (!capabilities) {
    return false;
  }

  if (Array.isArray(capabilities)) {
    return capabilities.some((capability) => {
      if (!capability || capability.id !== REQUIRED_CAPABILITY.id) {
        return false;
      }

      return Number(capability.version) >= REQUIRED_CAPABILITY.version;
    });
  }

  const capability = capabilities[REQUIRED_CAPABILITY.id];

  if (capability == null) {
    return false;
  }

  if (typeof capability === "number") {
    return capability >= REQUIRED_CAPABILITY.version;
  }

  if (typeof capability === "object") {
    if (capability.version == null) {
      return true;
    }

    return Number(capability.version) >= REQUIRED_CAPABILITY.version;
  }

  return true;
}

function requireStage3Capability(capabilities) {
  if (!hasRequiredCapability(capabilities)) {
    throw new Error(
      "trim-response requires loads.pitch.component-sum version 1 or later."
    );
  }
}

function approximatelyEqual(actual, expected, tolerance = 1e-6) {
  return Math.abs(actual - expected) <= tolerance;
}

function buildVerificationCases() {
  const numerical = analyzeTrimResponse({
    cm0: 0.04,
    cmAlphaPerRad: -0.8,
    angleOfAttackDeg: -2.86,
    disturbanceAlphaDeg: 2
  });

  const behavioralBaseline =
    disturbanceMomentCoefficientChange(-0.8, 2);

  const behavioralDoubled =
    disturbanceMomentCoefficientChange(-0.8, 4);

  const boundaryAtMinusFive =
    pitchingMomentCoefficient(0.04, 0, -5);

  const boundaryAtPlusFive =
    pitchingMomentCoefficient(0.04, 0, 5);

  const boundary = analyzeTrimResponse({
    cm0: 0.04,
    cmAlphaPerRad: 0,
    angleOfAttackDeg: 5,
    disturbanceAlphaDeg: 2
  });

  return [
    {
      name: "Numerical reference case",
      passed:
        approximatelyEqual(numerical.cmAtAlpha, 0.07993313, 1e-6) &&
        approximatelyEqual(numerical.alphaTrimDeg, 2.86478898, 1e-6) &&
        approximatelyEqual(numerical.deltaCm, -0.02792527, 1e-6) &&
        numerical.trimmed === false &&
        numerical.disturbanceTendency === "restoring"
    },
    {
      name: "Doubling disturbance doubles delta_Cm",
      passed: approximatelyEqual(
        behavioralDoubled,
        2 * behavioralBaseline,
        1e-12
      )
    },
    {
      name: "Zero Cm-alpha slope boundary",
      passed:
        boundary.deltaCm === 0 &&
        boundary.alphaTrimDeg === null &&
        boundary.disturbanceTendency === "neutral" &&
        approximatelyEqual(
          boundaryAtMinusFive,
          boundaryAtPlusFive,
          1e-12
        )
    }
  ];
}

function buildPlot(cm0, cmAlphaPerRad, selectedAngleDeg) {
  const minimumAngle = Math.min(-10, selectedAngleDeg);
  const maximumAngle = Math.max(10, selectedAngleDeg);

  const angleSet = new Set();

  for (
    let angleDeg = Math.floor(minimumAngle);
    angleDeg <= Math.ceil(maximumAngle);
    angleDeg += 1
  ) {
    angleSet.add(angleDeg);
  }

  angleSet.add(selectedAngleDeg);

  const sortedAngles = [...angleSet].sort((a, b) => a - b);

  return {
    title: "Cm-alpha relationship",
    xAxis: {
      label: "Angle of attack",
      unit: "deg"
    },
    yAxis: {
      label: "Pitching-moment coefficient",
      unit: ""
    },
    series: [
      {
        name: "Cm(alpha)",
        points: sortedAngles.map((angleDeg) => ({
          x: angleDeg,
          y: pitchingMomentCoefficient(
            cm0,
            cmAlphaPerRad,
            angleDeg
          )
        }))
      }
    ],
    referenceLines: [
      {
        axis: "y",
        value: 0,
        label: "Cm = 0 trim line"
      }
    ],
    regions: []
  };
}

function buildCapabilityValues(analysis) {
  return {
    cmAtAlpha: analysis.cmAtAlpha,
    alphaTrimDeg: analysis.alphaTrimDeg,
    deltaCm: analysis.deltaCm,
    trimmed: analysis.trimmed,
    disturbanceTendency: analysis.disturbanceTendency
  };
}

export const feature = {
  contractVersion: 4,
  id: "trim-response",
  title: "Live Cm–alpha relationship and trim",
  description:
    "Evaluates trim and small-disturbance pitching-moment tendency using a linear quasi-static Cm–alpha model.",
  category: "Stability · Student feature",
  learningMode: "concept",
  topicId: "stability",

  inputKeys: [
    "cm0",
    "cmAlphaPerRad",
    "angleOfAttackDeg",
    "disturbanceAlphaDeg"
  ],

  requiresCapabilities: [
    {
      id: "loads.pitch.component-sum",
      version: 1
    }
  ],

  providesCapabilities: [
    {
      id: "stability.pitch.cm-alpha",
      version: 1
    }
  ],

  assumptions: [
    "The Cm–alpha relationship is linear over the investigated range.",
    "The model is quasi-static and represents a small disturbance about the selected condition.",
    "Cm0 and Cm_alpha describe the same aircraft configuration and flight condition.",
    "Positive pitching moment and positive angle of attack are nose-up."
  ],

  validityLimits: [
    "Do not use the linear relationship at stall, large angle of attack, or strongly nonlinear aerodynamic conditions.",
    "The model does not calculate time history, damping, control motion, or handling quality.",
    "A restoring tendency does not establish acceptable safety, controllability, or flightworthiness.",
    "The calculated trim angle is meaningful only where the linear model remains valid."
  ],

  simulation: {
    display: "analysis-only",
    durationS: 1,
    initialState: {},
    controls: {},
    disturbance: {}
  },

  analyze(aircraft, capabilityContext) {
    requireStage3Capability(capabilityContext);

    const analysis = analyzeTrimResponse({
      cm0: aircraft.cm0,
      cmAlphaPerRad: aircraft.cmAlphaPerRad,
      angleOfAttackDeg: aircraft.angleOfAttackDeg,
      disturbanceAlphaDeg: aircraft.disturbanceAlphaDeg
    });

    const trimmedText = analysis.trimmed
      ? "trimmed"
      : "not trimmed";

    const trimAngleValue =
      analysis.alphaTrimDeg === null
        ? "not available"
        : analysis.alphaTrimDeg;

    let interpretation;

    if (analysis.trimmed) {
      interpretation =
        `The selected condition is trimmed within |Cm| <= 1e-6 and the small angle-of-attack disturbance has a ${analysis.disturbanceTendency} pitching-moment tendency. This quasi-static result does not establish dynamic stability, handling quality, controllability, safety, or flightworthiness.`;
    } else {
      interpretation =
        `The selected condition is not trimmed and the small angle-of-attack disturbance has a ${analysis.disturbanceTendency} pitching-moment tendency. This quasi-static result does not establish dynamic stability, handling quality, controllability, safety, or flightworthiness.`;
    }

    const status =
      analysis.disturbanceTendency === "destabilizing"
        ? "caution"
        : analysis.disturbanceTendency === "neutral"
          ? "neutral"
          : analysis.trimmed
            ? "pass"
            : "caution";

    return {
      results: [
        {
          id: "cm-at-alpha",
          label: "Cm(alpha)",
          value: analysis.cmAtAlpha,
          unit: "",
          precision: 6,
          emphasis: true
        },
        {
          id: "trim-angle",
          label: "Trim angle",
          value: trimAngleValue,
          unit: analysis.alphaTrimDeg === null ? "" : "deg",
          precision: analysis.alphaTrimDeg === null ? 0 : 5
        },
        {
          id: "delta-cm",
          label: "delta_Cm",
          value: analysis.deltaCm,
          unit: "",
          precision: 6
        },
        {
          id: "trim-status",
          label: "Selected condition",
          value: trimmedText,
          unit: "",
          precision: 0
        },
        {
          id: "disturbance-tendency",
          label: "Disturbance tendency",
          value: analysis.disturbanceTendency,
          unit: "",
          precision: 0
        }
      ],

      verificationCases: buildVerificationCases(),

      decision: {
        question:
          "At the selected angle of attack, is the simplified pitching-moment model trimmed, and does a small angle-of-attack disturbance create a restoring moment tendency?",
        interpretation,
        status
      },

      plots: [
        buildPlot(
          aircraft.cm0,
          aircraft.cmAlphaPerRad,
          aircraft.angleOfAttackDeg
        )
      ],

      scene: null,

      capabilities: {
        "stability.pitch.cm-alpha": {
          version: 1,
          values: buildCapabilityValues(analysis)
        }
      }
    };
  }
};

export const model = {
  kind: "derived",

  evaluate(runtimeContext) {
    requireStage3Capability(runtimeContext.capabilities);

    const aircraft = runtimeContext.aircraft ?? runtimeContext;

    const analysis = analyzeTrimResponse({
      cm0: aircraft.cm0,
      cmAlphaPerRad: aircraft.cmAlphaPerRad,
      angleOfAttackDeg: aircraft.angleOfAttackDeg,
      disturbanceAlphaDeg: aircraft.disturbanceAlphaDeg
    });

    return {
      values: buildCapabilityValues(analysis)
    };
  }
};