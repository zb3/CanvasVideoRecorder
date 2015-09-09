# CanvasVideoRecorder

CanvasVideoRecorder (CVR) lets you export frames produced by the `<canvas>` HTML5 element into a video file. This is done via:

* Setting up a http server in python
* Sending frames via XHR and putting them into a file
* Creating a video from these files using `ffmpeg`

Things you need to know:
* This cannot record any audio
* This can record at arbitrary FPS, but this also means it slows the animation down, so it cannot be used to record animations that rely on external events. But it is capable of recording animations that depend on the clock, thanks to the [MTC](/zb3/MockTheClock) library.
* The only (and actually accurate)
 way to know if an error occurred is to look at `ffmpeg` console output (JS part currently doesn't know the result)
* This is experimental
 
## Setup
You need **Python 3** and **ffmpeg** to run it.

The first thing you need to do is to configure the output format of the video. This is done by modifying those two lines in the `cvr.py` file (sorry for that):
```python
vcodec = ['-c:v', 'libx264', '-pix_fmt', 'yuv420p']
ext = 'mp4'
```
But these are just arguments passed to `ffmpeg`, and `ext` is the extension of the output file.

Then (assuming `cvr.js`, `MTC.js` and `MTCWorker.js` are in the same directory as `cvr.py`), you need to run a server like this:
```
python cvr.py -p 22633 path/to/web/project/here
```
Where `-p` is the port on which the server will run. Make sure this port is **inaccessible from outside!**

Here I assume that there's some web project in `path/to/web/project/here`, and that that directory is the one where the output video is to be stored. This is also the web root of CVR's HTTP server.

You don't really need to have a project there, but more on that later.

## The easy way

If `path/to/web/project/here` contains an `index.html` file, with an animation you want to record which uses `requestAnimationFrame` and occupies the whole space of the browser window, this gonna be really easy.

1. Navigate to `http://localhost:22633/` (or another port you've set up)
2. Open the JS console
3. Type:
    ```
    var video = new CVR(canvas_element, 'video_name', 30, {spoofWindowSize: [1920,     1080]});
    video.recordFrames({frames: 1000});
    ```
    Where the first argument is our canvas element, second argument is the output file name, and the third one is the output video FPS. There are additional options, more on that later.

    **Note** that `spoofWindowSize` doesn't force the video resolution - what it does is mask the value of variables like `innerWidth`, `innerHeight` etc, so this only works when the canvas occupies the whole space, and listens for `onchange` event. Otherwise, you must manually set the size of your canvas.

    `recordFrames` takes three possible optional arguments:
    - `frames` - the number of frames to record
    - `time` - the number of seconds to record
    - `dontSpoofTime` - if `true`, do not spoof the clock using the `MTC` library.     Note that if your animation relies on the clock (so as to keep constant update     speed), you will definitely want to leave spoofing on.
    - `onFinish` - callback to execute after recording finishes.
    - `func` - in case you have more than one function that is passed to           `requestAnimationFrame`, this parameter let's you specify the one to watch for

    You can call `recordFrames` without any arguments and manualy stop recording via:
    ```javascript
    video.stopRecording();
    ```
    
4. Wait.... (look @ the program console for errors :)). 
5. If everything succeeds ~~you're very lucky~~ you can stop the python program (via `Ctrl-C`) and enjoy your video
    ```
    mplayer video_name.mp4
    ```
 
### Recording in chunks
In case the .png files occupy too much space, you can record the video in chunks, that is, set the chunk size to `X` and the partial video will be created every `X` frames and then joined at the end, while the `.png` files will be removed after each chunk. Do this via passing `chunkSize` argument to the constructor:
```javascript
var video = new CVR([...], {[...], chunkSize: 500});
```

## The not so easy way

### My project doesn't use `requestAnimationFrame`

Apart from the fact your project probably should (but it's not my business), 
you have two ways to record the video:

#### The easier way
Extract the function that will update the canvas (so that calling it gives us the next frame), and then:
```javascript
video.snapFixed(updateFunction, numberOfFramesToSnap[, finishCallback, dontSpoofTime])
``` 
Where `updateFunction` our the extracted function.

#### The harder way
Manually update the canvas and call `video.snap(callback)` after each frame, and call `video.finish(callback)` to stop recording.

Just remember that CVR doesn't automatically spoof the time for you in this case, but it's not an issue since you can use functions provided by the MTC library directly.

### My project needs to be served by my own server

In this case, you still need to start the CVR server, but it will not serve your project. Since CVR files will not automatically be included, you will need to upload them to the web root of your project and include them manually.
Don't load them directly from the CVR server, because that will most likely break Workers (cross origin stuff...).

1. Upload `cvr.js`, `MTC.js` and `MTCWorker.js` to your project's directory
2. Include `cvr.js` and `MTC.js` as soon as possible:
    ```html
    <script type="text/javascript" src="MTC.js"></script>
    <script type="text/javascript" src="cvr.js"></script>
    ```
3. In case you've set a different port, pass it in the optional `port` argument to the constructor:
    ```javascript
    var video = new CVR([...], {[...], port: 22222});
    ```
