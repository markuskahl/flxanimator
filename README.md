# FlxAnimator

**FlxAnimator** is a lightweight desktop tool built with Electron. It allows you to create spritesheet animations visually and export them directly into ready-to-use HaxeFlixel classes.

## Features

- **Project Management:** Create, save, and load your animation projects (`.json`).
- **Spritesheet Configuration:** Easily configure frame width, height, spacing, and margin for your spritesheets.
- **Interactive Grid Selection:** Click on frames in the workspace grid to add them to your animation sequence. Frames are numbered so you can clearly see the order.
- **Live Preview:** Watch your animation play in real-time as you pick frames. You can also pan and zoom in the preview window!
- **Workspace Navigation:** Intuitive pan and zoom across your entire spritesheet using the mouse wheel and click-and-drag.
- **Animation Controls:** Create multiple animations (e.g., `idle`, `run`, `jump`) per project, set custom FPS, and toggle looping.
- **HaxeFlixel Export:** Automatically generate a `.hx` class that extends `FlxAnimationController` containing all your animation definitions. No more manual frame array typing!

## Installation

You will need [Node.js](https://nodejs.org/) installed on your computer.

1. Clone this repository:
   ```bash
   git clone https://github.com/markuskahl/flxanimator.git

   cd flxanimator
   ```

2. Install the required dependencies:
   ```bash
   npm install
   ```

3. Start the application:
   ```bash
   npm start
   ```

## Usage Guide

1. Click **New Project** and browse for your spritesheet image.
2. Define the **Frame Width** and **Frame Height** matching your spritesheet.
3. Click **Add Animation** in the sidebar to create a new state (e.g., "walk").
4. In the center workspace, click on the frames in the exact order you want them to play.
5. Check the live preview on the right side. You can adjust the FPS and Loop settings in the sidebar on the fly.
6. Click **Export** in the top right corner, specify a Class Name, and save your generated Haxe class directly into your game's source folder.

## Technology Stack

- Electron
- HTML5 / CSS3 (Vanilla, Glassmorphism UI)
- Vanilla JavaScript

## License
Read the `LICENSE` file for more details.
