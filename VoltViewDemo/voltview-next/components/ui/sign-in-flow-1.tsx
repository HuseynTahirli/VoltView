"use client";

import React, { useState, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { login, signup } from "@/lib/api";

type Uniforms = {
  [key: string]: { value: number[] | number[][] | number; type: string };
};

interface ShaderProps {
  source: string;
  uniforms: { [key: string]: { value: number[] | number[][] | number; type: string } };
  maxFps?: number;
}

interface SignInPageProps {
  className?: string;
}

const PW_RULES = [
  { id: "length", label: "At least 8 characters", test: (p: string) => p.length >= 8 },
  { id: "upper", label: "One uppercase letter", test: (p: string) => /[A-Z]/.test(p) },
  { id: "lower", label: "One lowercase letter", test: (p: string) => /[a-z]/.test(p) },
  { id: "special", label: "One special character", test: (p: string) => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(p) },
];

export const CanvasRevealEffect = ({
  animationSpeed = 10,
  opacities = [0.3, 0.3, 0.3, 0.5, 0.5, 0.5, 0.8, 0.8, 0.8, 1],
  colors = [[0, 255, 255]],
  containerClassName,
  dotSize,
  showGradient = true,
  reverse = false,
}: {
  animationSpeed?: number;
  opacities?: number[];
  colors?: number[][];
  containerClassName?: string;
  dotSize?: number;
  showGradient?: boolean;
  reverse?: boolean;
}) => {
  return (
    <div className={cn("h-full relative w-full", containerClassName)}>
      <div className="h-full w-full">
        <DotMatrix
          colors={colors ?? [[0, 255, 255]]}
          dotSize={dotSize ?? 3}
          opacities={opacities ?? [0.3, 0.3, 0.3, 0.5, 0.5, 0.5, 0.8, 0.8, 0.8, 1]}
          shader={`${reverse ? "u_reverse_active" : "false"}_; animation_speed_factor_${animationSpeed.toFixed(1)}_;`}
          center={["x", "y"]}
        />
      </div>
      {showGradient && <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent" />}
    </div>
  );
};

interface DotMatrixProps {
  colors?: number[][];
  opacities?: number[];
  totalSize?: number;
  dotSize?: number;
  shader?: string;
  center?: ("x" | "y")[];
}

const DotMatrix: React.FC<DotMatrixProps> = ({
  colors = [[0, 0, 0]],
  opacities = [0.04, 0.04, 0.04, 0.04, 0.04, 0.08, 0.08, 0.08, 0.08, 0.14],
  totalSize = 20,
  dotSize = 2,
  shader = "",
  center = ["x", "y"],
}) => {
  const uniforms = React.useMemo(() => {
    let colorsArray = [colors[0], colors[0], colors[0], colors[0], colors[0], colors[0]];
    if (colors.length === 2) colorsArray = [colors[0], colors[0], colors[0], colors[1], colors[1], colors[1]];
    else if (colors.length === 3) colorsArray = [colors[0], colors[0], colors[1], colors[1], colors[2], colors[2]];
    return {
      u_colors: { value: colorsArray.map((color) => [color[0] / 255, color[1] / 255, color[2] / 255]), type: "uniform3fv" },
      u_opacities: { value: opacities, type: "uniform1fv" },
      u_total_size: { value: totalSize, type: "uniform1f" },
      u_dot_size: { value: dotSize, type: "uniform1f" },
      u_reverse: { value: shader.includes("u_reverse_active") ? 1 : 0, type: "uniform1i" },
    };
  }, [colors, opacities, totalSize, dotSize, shader]);

  return (
    <Shader
      source={`
        precision mediump float;
        in vec2 fragCoord;
        uniform float u_time;
        uniform float u_opacities[10];
        uniform vec3 u_colors[6];
        uniform float u_total_size;
        uniform float u_dot_size;
        uniform vec2 u_resolution;
        uniform int u_reverse;
        out vec4 fragColor;
        float PHI = 1.61803398874989484820459;
        float random(vec2 xy) { return fract(tan(distance(xy * PHI, xy) * 0.5) * xy.x); }
        float map(float value, float min1, float max1, float min2, float max2) { return min2 + (value - min1) * (max2 - min2) / (max1 - min1); }
        void main() {
          vec2 st = fragCoord.xy;
          ${center.includes("x") ? "st.x -= abs(floor((mod(u_resolution.x, u_total_size) - u_dot_size) * 0.5));" : ""}
          ${center.includes("y") ? "st.y -= abs(floor((mod(u_resolution.y, u_total_size) - u_dot_size) * 0.5));" : ""}
          float opacity = step(0.0, st.x);
          opacity *= step(0.0, st.y);
          vec2 st2 = vec2(int(st.x / u_total_size), int(st.y / u_total_size));
          float frequency = 5.0;
          float show_offset = random(st2);
          float rand = random(st2 * floor((u_time / frequency) + show_offset + frequency));
          opacity *= u_opacities[int(rand * 10.0)];
          opacity *= 1.0 - step(u_dot_size / u_total_size, fract(st.x / u_total_size));
          opacity *= 1.0 - step(u_dot_size / u_total_size, fract(st.y / u_total_size));
          vec3 color = u_colors[int(show_offset * 6.0)];
          float animation_speed_factor = 0.5;
          vec2 center_grid = u_resolution / 2.0 / u_total_size;
          float dist_from_center = distance(center_grid, st2);
          float timing_offset_intro = dist_from_center * 0.01 + (random(st2) * 0.15);
          float max_grid_dist = distance(center_grid, vec2(0.0, 0.0));
          float timing_offset_outro = (max_grid_dist - dist_from_center) * 0.02 + (random(st2 + 42.0) * 0.2);
          float current_timing_offset;
          if (u_reverse == 1) {
            current_timing_offset = timing_offset_outro;
            opacity *= 1.0 - step(current_timing_offset, u_time * animation_speed_factor);
            opacity *= clamp((step(current_timing_offset + 0.1, u_time * animation_speed_factor)) * 1.25, 1.0, 1.25);
          } else {
            current_timing_offset = timing_offset_intro;
            opacity *= step(current_timing_offset, u_time * animation_speed_factor);
            opacity *= clamp((1.0 - step(current_timing_offset + 0.1, u_time * animation_speed_factor)) * 1.25, 1.0, 1.25);
          }
          fragColor = vec4(color, opacity);
          fragColor.rgb *= fragColor.a;
        }`}
      uniforms={uniforms}
      maxFps={60}
    />
  );
};

const ShaderMaterial = ({ source, uniforms }: { source: string; uniforms: Uniforms }) => {
  const { size } = useThree();
  const ref = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const material: any = ref.current.material;
    material.uniforms.u_time.value = clock.getElapsedTime();
  });

  const getUniforms = () => {
    const preparedUniforms: any = {};
    for (const uniformName in uniforms) {
      const uniform: any = uniforms[uniformName];
      switch (uniform.type) {
        case "uniform1f": preparedUniforms[uniformName] = { value: uniform.value, type: "1f" }; break;
        case "uniform1i": preparedUniforms[uniformName] = { value: uniform.value, type: "1i" }; break;
        case "uniform3f": preparedUniforms[uniformName] = { value: new THREE.Vector3().fromArray(uniform.value as number[]), type: "3f" }; break;
        case "uniform1fv": preparedUniforms[uniformName] = { value: uniform.value, type: "1fv" }; break;
        case "uniform3fv": preparedUniforms[uniformName] = { value: (uniform.value as number[][]).map((v) => new THREE.Vector3().fromArray(v)), type: "3fv" }; break;
        case "uniform2f": preparedUniforms[uniformName] = { value: new THREE.Vector2().fromArray(uniform.value as number[]), type: "2f" }; break;
      }
    }
    preparedUniforms["u_time"] = { value: 0, type: "1f" };
    preparedUniforms["u_resolution"] = { value: new THREE.Vector2(size.width * 2, size.height * 2) };
    return preparedUniforms;
  };

  const material = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: `
      precision mediump float;
      in vec2 coordinates;
      uniform vec2 u_resolution;
      out vec2 fragCoord;
      void main(){
        float x = position.x;
        float y = position.y;
        gl_Position = vec4(x, y, 0.0, 1.0);
        fragCoord = (position.xy + vec2(1.0)) * 0.5 * u_resolution;
        fragCoord.y = u_resolution.y - fragCoord.y;
      }`,
    fragmentShader: source,
    uniforms: getUniforms(),
    glslVersion: THREE.GLSL3,
    blending: THREE.CustomBlending,
    blendSrc: THREE.SrcAlphaFactor,
    blendDst: THREE.OneFactor,
  }), [size.width, size.height, source]);

  return (
    <mesh ref={ref as any}>
      <planeGeometry args={[2, 2]} />
      <primitive object={material} attach="material" />
    </mesh>
  );
};

const Shader: React.FC<ShaderProps> = ({ source, uniforms }) => (
  <Canvas className="absolute inset-0 h-full w-full">
    <ShaderMaterial source={source} uniforms={uniforms} />
  </Canvas>
);

export const SignInPage = ({ className }: SignInPageProps) => {
  const router = useRouter();
  const [step, setStep] = useState<"form" | "signup" | "success">("form");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<{ text: string; type: "error" | "success" } | null>(null);
  const [loading, setLoading] = useState(false);
  const [reverseCanvasVisible, setReverseCanvasVisible] = useState(false);
  const [initialCanvasVisible, setInitialCanvasVisible] = useState(true);

  const pwValid = PW_RULES.every(r => r.test(password));

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    setLoading(true);
    try {
      const res = await login(email, password);
      if (res.ok) {
        document.cookie = `voltview_token=${res.access_token}; path=/; max-age=604800; SameSite=Lax`;
        router.push("/");
      } else {
        setMsg({ text: res.message || "Invalid email or password.", type: "error" });
      }
    } catch {
      setMsg({ text: "Connection error. Is the server running?", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pwValid) return;
    setMsg(null);
    setLoading(true);
    try {
      const res = await signup(email, password);
      if (res.ok) {
        setMsg({ text: res.message || "Account created! You can now sign in.", type: "success" });
        setTimeout(() => { setStep("form"); setPassword(""); setMsg(null); }, 2500);
      } else {
        const alreadyExists = res.message?.toLowerCase().includes("already registered") ||
          res.message?.toLowerCase().includes("already exists") ||
          res.message?.toLowerCase().includes("user already");
        if (alreadyExists) {
          setMsg({ text: "__exists__", type: "error" });
        } else {
          setMsg({ text: res.message || "An error occurred.", type: "error" });
        }
      }
    } catch {
      setMsg({ text: "Connection error. Is the server running?", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full backdrop-blur-[1px] text-white border border-white/10 rounded-full py-3 px-4 focus:outline-none focus:border-white/30 text-center bg-transparent";

  return (
    <>
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@700;800&display=swap');
      @keyframes glow-ltr {
        0%   { background-position: -150% center; }
        100% { background-position: 250% center; }
      }
      .voltview-title {
        font-family: 'Orbitron', sans-serif;
        background: linear-gradient(
          90deg,
          rgba(255,255,255,0.45) 0%,
          rgba(255,255,255,0.45) 30%,
          rgba(255,255,255,1)    50%,
          rgba(255,255,255,0.45) 70%,
          rgba(255,255,255,0.45) 100%
        );
        background-size: 200% auto;
        -webkit-background-clip: text;
        background-clip: text;
        -webkit-text-fill-color: transparent;
        animation: glow-ltr 2.8s linear infinite;
        letter-spacing: 0.12em;
      }
    `}</style>
    <div className={cn("flex w-full flex-col min-h-screen bg-black relative", className)}>
      <div className="absolute inset-0 z-0">
        {initialCanvasVisible && (
          <div className="absolute inset-0">
            <CanvasRevealEffect animationSpeed={3} containerClassName="bg-black" colors={[[255, 255, 255], [255, 255, 255]]} dotSize={6} reverse={false} />
          </div>
        )}
        {reverseCanvasVisible && (
          <div className="absolute inset-0">
            <CanvasRevealEffect animationSpeed={4} containerClassName="bg-black" colors={[[255, 255, 255], [255, 255, 255]]} dotSize={6} reverse={true} />
          </div>
        )}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(0,0,0,1)_0%,_transparent_100%)]" />
        <div className="absolute top-0 left-0 right-0 h-1/3 bg-gradient-to-b from-black to-transparent" />
      </div>

      <div className="relative z-10 flex flex-1 flex-col justify-center items-center">
        <div className="w-full max-w-sm px-4">
          <AnimatePresence mode="wait">

            {step === "form" && (
              <motion.div key="sign-in" initial={{ opacity: 0, x: -60 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -60 }} transition={{ duration: 0.4, ease: "easeOut" }} className="space-y-6 text-center">
                <div className="flex flex-col items-center space-y-3">
                  <Image src="/assets/voltviewlogo.png" alt="VoltView" width={72} height={72}
                    style={{ objectFit: "contain", filter: "drop-shadow(0 0 8px rgba(255,255,255,0.9)) drop-shadow(0 0 20px rgba(255,255,255,0.5))" }} />
                  <div className="space-y-1">
                    <h1 className="text-[2.8rem] font-bold leading-[1.1] voltview-title">VoltView</h1>
                  </div>
                </div>
                <form onSubmit={handleSignIn} className="space-y-3">
                  <input type="email" placeholder="Email address" value={email} onChange={e => setEmail(e.target.value)} required className={inputClass} />
                  <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required className={inputClass} />
                  {msg && (
                    <div className="px-4 py-2 rounded-full text-sm" style={msg.type === "error" ? { background: "rgba(239,68,68,0.1)", color: "#f87171", border: "1px solid rgba(239,68,68,0.3)" } : { background: "rgba(74,222,128,0.1)", color: "#4ade80", border: "1px solid rgba(74,222,128,0.3)" }}>
                      {msg.text}
                    </div>
                  )}
                  <motion.button type="submit" disabled={loading} className="w-full rounded-full bg-white text-black font-semibold py-3 hover:bg-white/90 transition-colors disabled:opacity-50" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    {loading ? "Signing in..." : "Sign In"}
                  </motion.button>
                </form>
                <div className="flex flex-col items-center gap-2">
                  <button type="button" onClick={() => router.push('/forgot-password')} className="text-sm text-white/40 hover:text-white/70 transition-colors bg-transparent border-none cursor-pointer">
                    Forgot password?
                  </button>
                  <button onClick={() => { setStep("signup"); setPassword(""); setMsg(null); }} className="text-sm text-white/40 hover:text-white/70 transition-colors bg-transparent border-none cursor-pointer">
                    Don't have an account? Sign up
                  </button>
                </div>
              </motion.div>
            )}

            {step === "signup" && (
              <motion.div key="sign-up" initial={{ opacity: 0, x: 60 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 60 }} transition={{ duration: 0.4, ease: "easeOut" }} className="space-y-6 text-center">
                <div className="space-y-1">
                  <h1 className="text-[2.5rem] font-bold leading-[1.1] tracking-tight text-white">Create account</h1>
                  <p className="text-[1.2rem] text-white/70 font-light">Join VoltView today</p>
                </div>
                <form onSubmit={handleSignUp} className="space-y-3">
                  <input type="email" placeholder="Email address" value={email} onChange={e => setEmail(e.target.value)} required className={inputClass} />
                  <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required className={inputClass} />
                  <div className="text-left px-2 space-y-1.5">
                    {PW_RULES.map(r => {
                      const met = r.test(password);
                      return (
                        <div key={r.id} className="flex items-center gap-2 text-sm" style={{ color: met ? "#4ade80" : "#555" }}>
                          <span className="text-xs">{met ? "✓" : "✗"}</span>
                          <span>{r.label}</span>
                        </div>
                      );
                    })}
                  </div>
                  {msg && msg.text === "__exists__" ? (
                    <div className="px-4 py-3 rounded-xl text-sm text-center space-y-2" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)" }}>
                      <p style={{ color: "#f87171" }}>An account with this email already exists.</p>
                      <button type="button" onClick={() => { setStep("form"); setPassword(""); setMsg(null); }}
                        className="text-white underline underline-offset-2 cursor-pointer bg-transparent border-none text-sm">
                        Sign in instead
                      </button>
                    </div>
                  ) : msg ? (
                    <div className="px-4 py-2 rounded-full text-sm" style={msg.type === "error" ? { background: "rgba(239,68,68,0.1)", color: "#f87171", border: "1px solid rgba(239,68,68,0.3)" } : { background: "rgba(74,222,128,0.1)", color: "#4ade80", border: "1px solid rgba(74,222,128,0.3)" }}>
                      {msg.text}
                    </div>
                  ) : null}
                  <motion.button type="submit" disabled={loading || !pwValid} className="w-full rounded-full bg-white text-black font-semibold py-3 hover:bg-white/90 transition-colors disabled:opacity-30 disabled:cursor-not-allowed" whileHover={pwValid ? { scale: 1.02 } : {}} whileTap={pwValid ? { scale: 0.98 } : {}}>
                    {loading ? "Creating account..." : "Create Account"}
                  </motion.button>
                </form>
                <button onClick={() => { setStep("form"); setPassword(""); setMsg(null); }} className="text-sm text-white/40 hover:text-white/70 transition-colors bg-transparent border-none cursor-pointer">
                  Already have an account? Sign in
                </button>
              </motion.div>
            )}

            {step === "success" && (
              <motion.div key="success" initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: "easeOut", delay: 0.3 }} className="space-y-6 text-center">
                <div className="space-y-1">
                  <h1 className="text-[2.5rem] font-bold leading-[1.1] tracking-tight text-white">You're in!</h1>
                  <p className="text-[1.25rem] text-white/50 font-light">Welcome to VoltView</p>
                </div>
                <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.5, delay: 0.5 }} className="py-10">
                  <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-br from-white to-white/70 flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-black" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                </motion.div>
                <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }} onClick={() => router.push("/")} className="w-full rounded-full bg-white text-black font-medium py-3 hover:bg-white/90 transition-colors cursor-pointer">
                  Go to Dashboard
                </motion.button>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </div>
    </div>
    </>
  );
};
