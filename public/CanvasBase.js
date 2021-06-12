function Canvas() {

    var canvas = document.getElementById("canvas");
    var ctx = canvas.getContext("2d");

    canvas.width = document.body.clientWidth;
    canvas.height = document.body.clientHeight;

    // mouse position variable
    var mousePos = {
        x: 0, y: 0
    }

    // boolean for mouse down/up
    var mouseDown = false;

    // screen refresh rate in hz
    var refreshRate = 144;

    init();

    function updateMousePos(evt) {
        var rect = canvas.getBoundingClientRect();
        mousePos.x = evt.clientX - rect.left;
        mousePos.y = evt.clientY - rect.top;
    }

    function handleMouseMove(evt) {
        updateMousePos(evt);
    }

    function handleMouseDown(evt) {
        updateMousePos(evt);
        mouseDown = true;
    }

    function handleMouseUp(evt) {
        updateMousePos(evt);
        mouseDown = false;
    }

    function init() {
        // init basic listeners
        canvas.addEventListener('mousemove', handleMouseMove, false);
        canvas.addEventListener('mousedown', handleMouseDown, false);
        canvas.addEventListener('mouseup', handleMouseUp, false);

        // refresh at refresh rate
        setInterval(drawAll, 1000 / refreshRate);
    }

    function drawAll() {

        ctx.fillStyle = "#ffa0a0";

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (mouseDown) {

            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(mousePos.x, mousePos.y);
            ctx.stroke();

        }



    }

}

