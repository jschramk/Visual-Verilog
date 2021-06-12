

function square(x) {
    return x * x;
}

function squareDistance(point1, point2) {
    return square(point1.x - point2.x) + square(point1.y - point2.y);
}

function squareDistanceToSegment(point, lineStart, lineEnd) {

    var squaredDist = squareDistance(lineStart, lineEnd);

    if (squaredDist == 0) return squareDistance(point, lineStart);

    var t = ((point.x - lineStart.x) * (lineEnd.x - lineStart.x) + (point.y - lineStart.y) * (lineEnd.y - lineStart.y)) / squaredDist;

    t = Math.max(0, Math.min(1, t));

    return squareDistance(point, {

        x: lineStart.x + t * (lineEnd.x - lineStart.x),
        y: lineStart.y + t * (lineEnd.y - lineStart.y)

    });
}

function distanceToSegment(point, lineStart, lineEnd) {
    return Math.sqrt(squareDistanceToSegment(point, lineStart, lineEnd));
}

function inBounds(point, boundStart, boundWidth, boundHeight) {

    return point.x >= boundStart.x &&
        point.x <= boundStart.x + boundWidth &&
        point.y >= boundStart.y &&
        point.y <= boundStart.y + boundHeight;

}

function textDimensions(text, ctx) {

    var w = ctx.measureText(text).width;
    var h = parseInt(ctx.font.match(/\d+/), 10);

    return {
        width: w, height: h
    }

}