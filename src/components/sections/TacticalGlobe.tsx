"use client";

import { useEffect, useRef } from "react";

type Point = [number, number];
type Geometry = { id?: string | number; type: "Polygon" | "MultiPolygon"; arcs: number[][] | number[][][] };
type Topology = {
  transform?: { scale: Point; translate: Point };
  arcs: Point[][];
  objects: { countries: { geometries: Geometry[] } };
};
type Country = Point[][][];

const DEPOT = { latitude: 51.508, longitude: -0.51 };
const DEG = Math.PI / 180;
const TILT = 24 * DEG;

function decodeArcs(topology: Topology): Point[][] {
  if (!topology.transform) return topology.arcs;
  const { scale, translate } = topology.transform;
  return topology.arcs.map((arc) => {
    let x = 0;
    let y = 0;
    return arc.map(([dx, dy]) => {
      x += dx;
      y += dy;
      return [x * scale[0] + translate[0], y * scale[1] + translate[1]];
    });
  });
}

function resolveRing(indexes: number[], arcs: Point[][]): Point[] {
  const ring: Point[] = [];
  for (const index of indexes) {
    const source = index >= 0 ? arcs[index] : [...arcs[~index]].reverse();
    ring.push(...source.slice(ring.length ? 1 : 0));
  }
  return ring;
}

function decodeCountries(topology: Topology): Country[] {
  const arcs = decodeArcs(topology);
  return topology.objects.countries.geometries
    .filter((geometry) => String(geometry.id) !== "010")
    .map((geometry) =>
      geometry.type === "Polygon"
        ? [(geometry.arcs as number[][]).map((ring) => resolveRing(ring, arcs))]
        : (geometry.arcs as number[][][]).map((polygon) => polygon.map((ring) => resolveRing(ring, arcs))),
    );
}

function project(longitude: number, latitude: number, rotation: number, radius: number, cx: number, cy: number) {
  const lng = (longitude - rotation) * DEG;
  const lat = latitude * DEG;
  const cosLat = Math.cos(lat);
  const x0 = cosLat * Math.cos(lng);
  const horizontal = cosLat * Math.sin(lng);
  const z0 = Math.sin(lat);
  const depth = x0 * Math.cos(TILT) + z0 * Math.sin(TILT);
  const vertical = -x0 * Math.sin(TILT) + z0 * Math.cos(TILT);
  return { x: cx + radius * horizontal, y: cy - radius * vertical, visible: depth >= 0 };
}

function traceLine(
  context: CanvasRenderingContext2D,
  points: Point[],
  rotation: number,
  radius: number,
  cx: number,
  cy: number,
) {
  context.beginPath();
  let drawing = false;
  let visible = 0;
  for (const [longitude, latitude] of points) {
    const point = project(longitude, latitude, rotation, radius, cx, cy);
    if (!point.visible) {
      drawing = false;
      continue;
    }
    visible += 1;
    if (drawing) context.lineTo(point.x, point.y);
    else context.moveTo(point.x, point.y);
    drawing = true;
  }
  return visible;
}

function drawGraticule(context: CanvasRenderingContext2D, rotation: number, radius: number, cx: number, cy: number) {
  context.strokeStyle = "rgba(23,37,84,.16)";
  context.lineWidth = 0.7;
  for (let latitude = -60; latitude <= 60; latitude += 30) {
    const points: Point[] = [];
    for (let longitude = -180; longitude <= 180; longitude += 3) points.push([longitude, latitude]);
    traceLine(context, points, rotation, radius, cx, cy);
    context.stroke();
  }
  for (let longitude = -180; longitude < 180; longitude += 30) {
    const points: Point[] = [];
    for (let latitude = -85; latitude <= 85; latitude += 3) points.push([longitude, latitude]);
    traceLine(context, points, rotation, radius, cx, cy);
    context.stroke();
  }
}

function drawCountries(context: CanvasRenderingContext2D, countries: Country[], rotation: number, radius: number, cx: number, cy: number) {
  context.fillStyle = "#fdfdfd";
  context.strokeStyle = "rgba(37,99,235,.34)";
  context.lineWidth = 0.55;
  for (const country of countries) {
    for (const polygon of country) {
      for (const ring of polygon) {
        if (traceLine(context, ring, rotation, radius, cx, cy) > 2) {
          context.closePath();
          context.fill();
          context.stroke();
        }
      }
    }
  }
}

export function TacticalGlobe({ depot }: { depot: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;

    let countries: Country[] = [];
    let rotation = -3;
    let dragOrigin = 0;
    let rotationOrigin = rotation;
    let dragging = false;
    let frame = 0;
    let disposed = false;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const onPointerDown = (event: PointerEvent) => {
      dragging = true;
      dragOrigin = event.clientX;
      rotationOrigin = rotation;
      canvas.setPointerCapture(event.pointerId);
    };
    const onPointerMove = (event: PointerEvent) => {
      if (dragging) rotation = rotationOrigin + (event.clientX - dragOrigin) * 0.22;
    };
    const onPointerUp = (event: PointerEvent) => {
      dragging = false;
      if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
    };

    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerup", onPointerUp);
    canvas.addEventListener("pointercancel", onPointerUp);

    const render = (now: number) => {
      const bounds = canvas.getBoundingClientRect();
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      const width = Math.max(1, Math.round(bounds.width * ratio));
      const height = Math.max(1, Math.round(bounds.height * ratio));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      context.clearRect(0, 0, bounds.width, bounds.height);

      if (!dragging && !reducedMotion) rotation = -3 + Math.sin(now / 6500) * 6;
      const cx = bounds.width / 2;
      const cy = bounds.height / 2;
      const radius = Math.max(48, Math.min(bounds.width, bounds.height) * 0.42);

      const glow = context.createRadialGradient(cx, cy, radius * 0.65, cx, cy, radius * 1.25);
      glow.addColorStop(0, "rgba(255,255,255,0)");
      glow.addColorStop(0.78, "rgba(255,255,255,.24)");
      glow.addColorStop(1, "rgba(255,255,255,0)");
      context.fillStyle = glow;
      context.fillRect(0, 0, bounds.width, bounds.height);

      context.save();
      context.beginPath();
      context.arc(cx, cy, radius, 0, Math.PI * 2);
      context.clip();
      const ocean = context.createRadialGradient(cx - radius * 0.3, cy - radius * 0.32, 0, cx, cy, radius);
      ocean.addColorStop(0, "#ffffff");
      ocean.addColorStop(0.68, "#eef3ff");
      ocean.addColorStop(1, "#dce7ff");
      context.fillStyle = ocean;
      context.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);
      drawGraticule(context, rotation, radius, cx, cy);
      drawCountries(context, countries, rotation, radius, cx, cy);
      context.restore();

      context.strokeStyle = "rgba(255,255,255,.82)";
      context.lineWidth = 1.2;
      context.beginPath();
      context.arc(cx, cy, radius, 0, Math.PI * 2);
      context.stroke();

      const marker = project(DEPOT.longitude, DEPOT.latitude, rotation, radius, cx, cy);
      if (marker.visible) {
        const pulse = reducedMotion ? 12 : 11 + ((now / 55) % 18);
        context.fillStyle = `rgba(96,165,250,${Math.max(0, 0.42 - (pulse - 11) / 48)})`;
        context.beginPath();
        context.arc(marker.x, marker.y, pulse, 0, Math.PI * 2);
        context.fill();
        context.fillStyle = "#60a5fa";
        context.strokeStyle = "#ffffff";
        context.lineWidth = 2;
        context.beginPath();
        context.arc(marker.x, marker.y, 5.5, 0, Math.PI * 2);
        context.fill();
        context.stroke();
      }

      if (!disposed) frame = requestAnimationFrame(render);
    };

    fetch("/data/countries-110m.json")
      .then((response) => {
        if (!response.ok) throw new Error("Globe data unavailable");
        return response.json() as Promise<Topology>;
      })
      .then((topology) => {
        if (!disposed) countries = decodeCountries(topology);
      })
      .catch(() => {
        countries = [];
      });

    frame = requestAnimationFrame(render);
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("pointercancel", onPointerUp);
    };
  }, []);

  return (
    <div className="relative mx-auto w-full max-w-lg">
      <canvas
        ref={canvasRef}
        className="h-[20rem] w-full cursor-grab touch-none active:cursor-grabbing sm:h-[24rem]"
        role="img"
        aria-label={`Interactive globe showing NP Coaches' UK depot at ${depot}`}
      />
      <div className="pointer-events-none absolute inset-x-0 bottom-2 flex justify-center">
        <span className="rounded-full border border-sky-400/25 bg-navy/90 px-4 py-2 text-xs font-semibold text-white shadow-lg backdrop-blur">
          <span className="mr-2 inline-block h-2 w-2 rounded-full bg-sky-400" aria-hidden="true" />
          UK depot · {depot}
        </span>
      </div>
    </div>
  );
}