export const MANIM_DOCS = `
# MANIM BEST PRACTICES & DOCUMENTATION

This guide enforces **robust, non-glitchy Manim Community Edition scenes** with clean layouts, readable math, predictable animations, and production-safe structure.

Manim rewards **structure, patience, and restraint**.
Clean scenes > fancy scenes.

---

## CRITICAL: EXACT API PARAMETERS (READ THIS FIRST)

### Why "unexpected keyword argument" Errors Happen

Manim uses Python inheritance where \`**kwargs\` flow up the chain:

\`\`\`
MathTex → Tex → SVGMobject → VMobject → Mobject
Axes.plot() → ParametricFunction → VMobject → Mobject
\`\`\`

Unknown parameters eventually reach \`Mobject.__init__()\` which throws:
\`TypeError: Mobject.__init__() got an unexpected keyword argument 'X'\`

**NEVER guess parameter names. Only use documented parameters below.**

---

### EXACT Valid Parameters by Class

#### MathTex Constructor
\`\`\`python
MathTexathTex(
    *tex_strings: str,                    # LaTeX strings
    arg_separator: str = " ",              # Separator between strings
    substrings_to_isolate: list[str],     # ✅ REAL - isolates substrings
    tex_to_color_map: dict[str, color],   # ✅ REAL - maps tex to colors
    tex_environment: str = "align*",       # LaTeX environment
    # Plus standard Mobject kwargs (color, fill_color, stroke_color, etc.)
)
\`\`\`

❌ **FAKE/HALLUCINATED:** \`substrings_to_colors\` - **NEVER USE**
✅ **CORRECT:** Use \`tex_to_color_map\` instead

**Correct patterns for coloring MathTex:**

\`\`\`python
# Pattern 1: Constructor with tex_to_color_map
MathTex(r"f(x) = x^2", tex_to_color_map={"f": RED, "x": BLUE})

# Pattern 2: substrings_to_isolate + set_color_by_tex()
tex = MathTex(r"a + b = c", substrings_to_isolate=["a", "b"])
tex.set_color_by_tex("a", RED)

# Pattern 3: Manual indexing with {{ }}
tex = MathTex(r"{{ a }} + {{ b }}")
tex[0].set_color(RED)  # Colors 'a'
\`\`\`

---

#### VMobject / Mobject Base Parameters
\`\`\`python
# These are the ONLY valid kwargs for most mobjects:
color: ParsableManimColor           # Overall color
fill_color: ParsableManimColor      # Fill color
stroke_color: ParsableManimColor    # Stroke/outline color
stroke_width: float                 # Line width (default: 0)
fill_opacity: float                 # Fill transparency (0-1)
stroke_opacity: float               # Stroke transparency (0-1)
\`\`\`

❌ **NEVER USE:** \`stroke_dash_array\`, \`dash_length\`, \`dash_pattern\`
✅ **CORRECT:** Create solid first, then wrap with \`DashedVMobject\`

---

#### Axes.plot() / ParametricFunction
\`\`\`python
# Valid kwargs (passed to VMobject):
color: ParsableManimColor           # Line color
stroke_width: float                 # Line thickness
\`\`\`

❌ **NEVER USE:** \`stroke_dash_array\`, \`dash_length\`, \`line_style\`
✅ **CORRECT:**
\`\`\`python
solid = axes.plot(lambda x: x**2, color=BLUE)
dashed = DashedVMobject(solid, num_dashes=20)
\`\`\`

---

### Common Hallucinated Parameters (NEVER USE)

| ❌ FAKE (Causes Errors) | ✅ CORRECT Alternative | Purpose |
|------------------------|------------------------|---------|
| \`substrings_to_colors\` | \`tex_to_color_map\` | Color MathTex substrings in constructor |
| \`stroke_dash_array\` | \`DashedVMobject(obj)\` | Create dashed lines |
| \`dash_length\` | \`DashedVMobject(obj, dashed_ratio=0.5)\` | Control dash pattern |
| \`line_style\` | \`stroke_width=2\` or \`DashedVMobject\` | Line styling |
| \`substrings_to_color\` | \`tex_to_color_map\` | Color mapping |
| \`font_color\` | \`color=RED\` or \`set_color(RED)\` | Text color |

---

### Golden Rule

**When in doubt, check the Manim source or documentation.**
Never invent parameter names. If a parameter name sounds descriptive but isn't in the docs, it's probably wrong.

---

## 1. SCENE STRUCTURE (NON-NEGOTIABLE)

* ALWAYS define a class inheriting from:

  * \`Scene\`
  * \`MovingCameraScene\` (if camera motion is required)
  * \`ThreeDScene\` (for 3D)
* ALWAYS define:

  \`\`\`python
  def construct(self):
  \`\`\`
* NEVER place animation logic outside \`construct\`
* NEVER use interactive input:

  * \`input()\`
  * sliders
  * runtime user interaction
* Scenes MUST be **deterministic**

  * No randomness unless explicitly seeded

✅ Good:

\`\`\`python
class MyScene(Scene):
    def construct(self):
        ...
\`\`\`

❌ Forbidden:

* Global animations
* Code executing at import time
* Runtime user input
* Side effects outside \`construct\`

---

## 2. TEXT, LaTeX & TYPOGRAPHY (MOST COMMON FAILURE POINT)

### Math (STRICT)

* ALWAYS use \`MathTex\`
* ALWAYS use raw strings: \`r"..."\`
* Prefer **simple LaTeX**
* Avoid advanced packages (Manim does not load them)

✅ Good:

\`\`\`python
eq = MathTex(r"F = ma")
\`\`\`

❌ Bad:

\`\`\`python
MathTex("\\frac{d}{dx}")  # brittle escaping
\`\`\`

---

### Regular Text

* Use \`Text\` for explanations, labels, titles
* Avoid long lines that overflow screen width
* Split content into multiple \`Text\` objects if needed

---

### Font Scaling Rules (CONSISTENT)

* Titles: \`scale(0.9 – 1.2)\`
* Body text: \`scale(0.6 – 0.8)\`
* Labels: \`scale(0.5 – 0.6)\`

Text should **support** visuals, never dominate them.

---

## 3. LAYOUT & POSITIONING (NO OVERLAPS)

### Golden Rules

* NEVER hardcode coordinates like:

  \`\`\`python
  move_to([2, 1, 0])
  \`\`\`

  unless absolutely unavoidable
* ALWAYS position objects **relative to each other**
* **GROUP EARLY, MOVE LATE**

---

### Core Layout Tools

* \`next_to\`
* \`to_edge\`
* \`align_to\`
* \`arrange\`
* \`VGroup\`

---

### Example: Clean Vertical Layout

\`\`\`python
title = Text("Energy Levels").to_edge(UP)

eq1 = MathTex(r"E_n = -\frac{13.6}{n^2}")
eq2 = MathTex(r"n = 1, 2, 3, \dots")

content = VGroup(eq1, eq2).arrange(DOWN, buff=0.6)
content.next_to(title, DOWN, buff=0.8)
\`\`\`

---

### Debugging Overlap

* Temporarily add:

  \`\`\`python
  SurroundingRectangle(mobject)
  \`\`\`
* Use \`.get_top()\`, \`.get_bottom()\` for alignment sanity checks

---

## 4. CLEARING & REUSING SCENES (VERY IMPORTANT)

### Scene End Clearance (MANDATORY)

At the **end of every scene**, you MUST clear and remove all elements:

\`\`\`python
# Final scene cleanup - ALWAYS do this at the end of construct()
self.play(*[FadeOut(mob) for mob in self.mobjects], run_time=1.0)
self.wait(0.5)
self.clear()
\`\`\`

**Rules:**
- NEVER leave mobjects on screen when scene ends
- Always use \`FadeOut\` or similar exit animations before clearing
- Include \`self.clear()\` after animations complete
- Do not call \`self.clear()\` mid-scene (abrupt)

### Full Clear (Preferred)

\`\`\`python
self.play(*[FadeOut(mob) for mob in self.mobjects])
self.wait(0.5)
\`\`\`

* Avoid \`self.clear()\` mid-scene (feels abrupt)
* Let animations end cleanly

---

### Partial Clear

* Always store logical groups:

\`\`\`python
self.play(FadeOut(graph_group))
\`\`\`

---

## 5. AXES & FUNCTION PLOTTING

### Standard Function Plot

\`\`\`python
axes = Axes(
    x_range=[-5, 5, 1],
    y_range=[-4, 4, 1],
    axis_config={"include_tip": False}
)

graph = axes.plot(lambda x: x**2, color=BLUE)
\`\`\`

---

### Animated / Dynamic Plot

\`\`\`python
t = ValueTracker(0)

graph = always_redraw(lambda:
    axes.plot(
        lambda x: np.sin(x),
        x_range=[0, t.get_value()]
    )
)

self.add(graph)
self.play(t.animate.set_value(6), run_time=4, rate_func=linear)
\`\`\`

---

### Multiple Functions

* ALWAYS label
* ALWAYS use consistent colors

\`\`\`python
f1 = axes.plot(lambda x: x, color=BLUE)
f2 = axes.plot(lambda x: x**2, color=RED)
\`\`\`

---

## 6. PARAMETRIC & IMPLICIT CURVES

### Parametric

\`\`\`python
curve = ParametricFunction(
    lambda t: np.array([np.cos(t), np.sin(t), 0]),
    t_range=[0, TAU],
    color=GREEN
)
\`\`\`

---

### Implicit (Contours)

\`\`\`python
circle = ImplicitFunction(
    lambda x, y: x**2 + y**2 - 1,
    color=BLUE
)
\`\`\`

⚠️ Keep ranges small — implicit plots are expensive.

---

## 7. MATRICES & LINEAR ALGEBRA

### Matrices

\`\`\`python
matrix = Matrix([
    [1, 2],
    [3, 4]
])
\`\`\`

---

### Transforming Vectors

\`\`\`python
plane = NumberPlane()
vector = Vector([1, 1])
matrix = [[2, 0], [0, 1]]

self.play(ApplyMatrix(matrix, vector))
\`\`\`

### Rules

* Always show **before and after**
* Color-code vectors
* Use slow transformations (\`run_time >= 2\`)

---

## 8. TABLES (DATA VISUALIZATION)

\`\`\`python
table = Table(
    [["x", "f(x)"],
     ["0", "0"],
     ["1", "1"],
     ["2", "4"]],
    include_outer_lines=True
)
table.scale(0.7)
\`\`\`

Avoid wide tables — they overflow easily.

---

## 9. SVGs & ICONS

\`\`\`python
icon = SVGMobject("atom.svg").scale(0.5)
\`\`\`

Rules:

* Simple paths only
* Avoid gradients
* Style via \`.set_fill()\`

---

## 10. ANIMATION PACING (READABILITY > SPEED)

### Timing Heuristics

* Write / Create: \`1 – 2s\`
* Transform: \`1.5 – 3s\`
* Graph draw: \`3 – 6s\`
* Pause between ideas: \`self.wait(0.5 – 1)\`

❌ Bad:

* Too many animations at once
* No pauses
* Fast math reveals

---

## 11. DEBUGGING MANIM SCENES

Common fixes:

* LaTeX error → simplify expression
* Overlap → \`VGroup.arrange\`
* Clipping → scale content, not camera
* Performance → reduce redraws

### Parameters to NEVER Use

* \`dash_length\` — causes errors; use alternative styling instead
* \`stroke_dash_array\` — **CRITICAL:** Causes TypeError in Manim CE; VMobject does not accept this parameter

### CORRECT: Creating Dashed Lines

**NEVER pass stroke_dash_array to plot() or ParametricFunction:**

❌ WRONG - This causes the TypeError:
\`\`\`python
graph = axes.plot(lambda x: x**2, stroke_dash_array=[0.1, 0.1])  # CRASH!
\`\`\`

✅ CORRECT - Use DashedLine or DashedVMobject:
\`\`\`python
# Option 1: Create solid line first, then apply DashedVMobject
from manim import DashedVMobject
solid_graph = axes.plot(lambda x: x**2, color=BLUE)
dashed_graph = DashedVMobject(solid_graph, dashed_ratio=0.5)
self.add(dashed_graph)

# Option 2: For straight lines, use DashedLine
from manim import DashedLine
dashed_line = DashedLine(start=LEFT, end=RIGHT, color=RED)
\`\`\`

**Key Rule:** If you need dashed styling, create the solid object first, then wrap it with DashedVMobject. Never pass dash parameters to constructors.

---

## 12. VECTOR FIELDS (FLOW & DIRECTION)

### Principles

* Direction first, magnitude second
* Prefer **density over arrow length**
* Sparse > dense

### Visual Rules

* Thin arrows
* One accent color only

### Labeling

* At most ONE label (e.g. **F**, **v**, **E**)
* Never overlap arrows with text

---

## 13. NODE GRAPHS (NETWORKS)

### Nodes

* Small filled circles
* Identical unless hierarchy is essential

### Edges

* Straight lines by default
* Curves only to avoid overlap

### Layout

* Prefer symmetry
* Avoid crossings
* Generous spacing

Highlight using **one accent color only**.

---

## 14. COLOR SYSTEM (STRICT)

### Base

* Background: near-black (\`#070707\`)
* Foreground: off-white (\`#FAFAFA\`)

### Accents (MAX TWO)

* Blue → structure, stability
* Red → motion, change, force

Never decorative.

---

## 15. SPACING & COMPOSITION

* Negative space is intentional
* Do NOT fill the frame
* Diagram + text separation
* Asymmetry preferred over centering

---

## 16. TYPOGRAPHY SYSTEM

* Titles: bold sans-serif, uppercase, rare
* Labels: small, subtle
* No decorative fonts
* No italic headings
* Text is structural, not decorative

---

## 17. VISUAL PHILOSOPHY

* Calm
* Precise
* Serious
* One concept per scene
* If impressive but unclear → remove it

---

## 18. PHYSICS & SIMULATIONS (CRITICAL)

### Canonical Pattern: Synchronized System

Use **ValueTracker + always_redraw** to drive *everything* from a single time variable.

\`\`\`python
t = ValueTracker(0)

def get_y(time):
    return np.exp(-0.5 * time) * np.cos(3 * time)

spring = always_redraw(lambda: ParametricFunction(
    lambda u: np.array([
        0.5 * np.sin(u * PI * 5),
        2 - u * (2 - get_y(t.get_value())),
        0
    ]),
    t_range=[0, 1],
    color=GREY
).move_to(UP * 2))

box = always_redraw(lambda:
    Square(side_length=0.5, color=BLUE, fill_opacity=0.5)
    .next_to(spring, DOWN, buff=0)
)

dot = always_redraw(lambda:
    Dot(axes.c2p(t.get_value(), get_y(t.get_value())), color=RED)
)

self.add(spring, box, dot)
self.play(t.animate.set_value(10), run_time=8, rate_func=linear)
\`\`\`

This pattern guarantees:

* No desync
* No glitches
* One source of truth

---

## FINAL CHECKLIST BEFORE RENDER

* [ ] No overlapping text
* [ ] Math readable at normal speed
* [ ] Logical grouping everywhere
* [ ] Clean clears
* [ ] No absolute-position hacks
`;
