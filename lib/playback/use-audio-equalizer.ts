"use client";

import { useCallback, useEffect, useRef, type RefObject } from "react";
import {
  EQUALIZER_BANDS_HZ,
  normalizeEqualizerGainsDb,
} from "@/lib/playback/equalizer";

type AudioContextConstructor = typeof AudioContext;

type WindowWithWebkitAudioContext = Window & {
  webkitAudioContext?: AudioContextConstructor;
};

type EqualizerGraph = {
  context: AudioContext;
  source: MediaElementAudioSourceNode;
  filters: BiquadFilterNode[];
  connected: boolean;
};

const graphByElement = new WeakMap<HTMLMediaElement, EqualizerGraph>();

function getAudioContextConstructor(): AudioContextConstructor | null {
  if (typeof window === "undefined") return null;
  return (
    window.AudioContext ??
    (window as WindowWithWebkitAudioContext).webkitAudioContext ??
    null
  );
}

function applyEqualizerGains(
  graph: EqualizerGraph,
  gainsDb: readonly number[],
): void {
  const nextGains = normalizeEqualizerGainsDb(gainsDb);
  graph.filters.forEach((filter, index) => {
    filter.gain.setTargetAtTime(
      nextGains[index] ?? 0,
      graph.context.currentTime,
      0.01,
    );
  });
}

function connectEqualizerGraph(graph: EqualizerGraph): void {
  if (graph.connected) return;
  graph.source.connect(graph.filters[0]);
  for (let i = 0; i < graph.filters.length - 1; i += 1) {
    graph.filters[i].connect(graph.filters[i + 1]);
  }
  graph.filters[graph.filters.length - 1].connect(graph.context.destination);
  graph.connected = true;
}

function createEqualizerGraph(
  el: HTMLMediaElement,
  gainsDb: readonly number[],
): EqualizerGraph | null {
  const AudioContextCtor = getAudioContextConstructor();
  if (!AudioContextCtor) return null;
  const context = new AudioContextCtor();
  const source = context.createMediaElementSource(el);
  const filters = EQUALIZER_BANDS_HZ.map((frequencyHz, index) => {
    const filter = context.createBiquadFilter();
    filter.type =
      index === 0
        ? "lowshelf"
        : index === EQUALIZER_BANDS_HZ.length - 1
          ? "highshelf"
          : "peaking";
    filter.frequency.value = frequencyHz;
    filter.Q.value = 1;
    return filter;
  });
  const graph: EqualizerGraph = {
    context,
    source,
    filters,
    connected: false,
  };
  connectEqualizerGraph(graph);
  applyEqualizerGains(graph, gainsDb);
  return graph;
}

/**
 * Creates a 10-band Web Audio equalizer for an <audio> element on demand.
 */
export default function useAudioEqualizer(
  audioRef: RefObject<HTMLAudioElement | null>,
  gainsDb: readonly number[],
): () => Promise<void> {
  const graphRef = useRef<EqualizerGraph | null>(null);
  const gainsRef = useRef(gainsDb);

  useEffect(() => {
    gainsRef.current = gainsDb;
    if (graphRef.current) applyEqualizerGains(graphRef.current, gainsDb);
  }, [gainsDb]);

  const ensureEqualizerReady = useCallback(async (): Promise<void> => {
    const el = audioRef.current;
    if (!el) return;

    let graph = graphRef.current ?? graphByElement.get(el) ?? null;
    if (!graph) {
      try {
        graph = createEqualizerGraph(el, gainsRef.current);
      } catch (err) {
        console.warn("Equalizer could not attach to the audio element.", err);
        return;
      }
      if (!graph) return;
      graphByElement.set(el, graph);
      graphRef.current = graph;
    }

    connectEqualizerGraph(graph);
    applyEqualizerGains(graph, gainsRef.current);
    if (graph.context.state === "suspended") {
      await graph.context.resume();
    }
  }, [audioRef]);

  useEffect(() => {
    return (): void => {
      const graph = graphRef.current;
      if (!graph) return;
      graph.source.disconnect();
      graph.filters.forEach((filter) => filter.disconnect());
      graph.connected = false;
    };
  }, []);

  return ensureEqualizerReady;
}
