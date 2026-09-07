# FlxAnimator

**FlxAnimator** is a lightweight desktop tool built with Electron. It allows you to create and configure spritesheet animations visually and save them as structured JSON files (`.json`) for use in your games and engines.

![FlxAnimator Screenshot](Screenshot-FlxAnimator.png)

## Features

- **Project Management:** Create, save (`Ctrl+S`), and save as (`Ctrl+Shift+S`) your animation projects directly to `.json`.
- **Recent Projects:** Quickly resume your work from a list of recently opened projects on the start screen.
- **Spritesheet Configuration:** Configure frame width, height, spacing, and margin for your spritesheets when creating a project.
- **Runtime Configuration:** Adjust Frame Width, Frame Height, Spacing, Margin, or swap the Spritesheet image at runtime directly from the sidebar or via the **Settings** dialog with instant visual feedback and full Undo/Redo support.
- **Timeline Editor:** Manage your animation frames with a fully featured timeline. Supports drag-and-drop from the spritesheet, duplication, and deletion of frames.
- **Live Preview:** Watch your animation play in real-time as you pick frames. You can also pan and zoom in the preview window!
- **Workspace Navigation:** Intuitive pan and zoom across your entire spritesheet using the mouse wheel and click-and-drag.
- **Animation Controls:** Create multiple animations (e.g., `idle`, `run`, `jump`) per project, set custom FPS, toggle looping, horizontal/vertical flipping, and define a default animation.
- **Clean UI:** A distraction-free, modern glassmorphism interface that hides unnecessary elements when not in use.

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

## Building

To create a standalone Windows executable (.exe), run the following command:

```bash
npm run build
```

The compiled application will be located in the `dist` folder.

## Usage Guide

1. On the start screen, click **New** and browse for your spritesheet image, or quickly open a **Recent Project**.
2. Define the **Frame Width**, **Frame Height**, **Spacing**, and **Margin** matching your spritesheet. You can also adjust any of these settings at any time during editing via the **Spritesheet & Grid** sidebar panel or the **Settings** button in the header.
3. Click **Add Animation** in the sidebar to create a new animation state (e.g., "walk").
4. Manage your frames using the timeline panel below the workspace. You can click on the grid to add frames, or drag-and-drop frames from the grid directly onto the timeline.
5. Check the live preview on the right side. You can adjust FPS, loop, and flip settings in the sidebar on the fly, and choose a **Default Animation** from the dropdown.
6. Click **Save** or **Save As** to save your project as a `.json` file.

## JSON File Format

The saved `.json` file contains all spritesheet configurations, animation definitions, and metadata:

```json
{
  "imagePath": "C:/Projects/MyGame/assets/player.png",
  "config": {
    "width": 16,
    "height": 16,
    "spacing": 0,
    "margin": 0
  },
  "animations": [
    {
      "name": "idle",
      "fps": 15,
      "loop": true,
      "flipX": false,
      "flipY": false,
      "frames": [0, 1, 2]
    },
    {
      "name": "walk",
      "fps": 15,
      "loop": true,
      "flipX": false,
      "flipY": false,
      "frames": [3, 4, 5, 6]
    }
  ],
  "defaultAnimation": "idle"
}
```

## Using in HaxeFlixel

You can easily parse and load the exported `.json` file in HaxeFlixel:

```haxe
import flixel.FlxSprite;
import haxe.Json;
import openfl.utils.Assets;

class Player extends FlxSprite {
    public function new(X:Float = 0, Y:Float = 0) {
        super(X, Y);
        
        // Load and parse animation JSON
        var jsonText = Assets.getText("assets/data/player.json");
        var animData = Json.parse(jsonText);
        
        // Setup graphic using dimensions from JSON
        loadGraphic(
            "assets/images/player.png",
            true,
            animData.config.width,
            animData.config.height,
            false,
            null,
            animData.config.spacing
        );
        
        // Add animations
        for (anim in (cast animData.animations : Array<Dynamic>)) {
            animation.add(anim.name, anim.frames, anim.fps, anim.loop, anim.flipX, anim.flipY);
        }
        
        // Play default animation if specified
        if (animData.defaultAnimation != null) {
            animation.play(animData.defaultAnimation);
        }
    }
}
```

## Technology Stack

- Electron
- HTML5 / CSS3 (Vanilla, Glassmorphism UI)
- Vanilla JavaScript

## License
Read the `LICENSE` file for more details.
