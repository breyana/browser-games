class Vector {
  constructor(x, y) {
    this.x = x; this.y = y;
  }
  plus(other) {
    return new Vector(this.x + other.x, this.y + other.y);
  }
  times(factor) {
    return new Vector(this.x * factor, this.y * factor);
  }
}

const playerXSpeed = 7;
const gravity = 30;
const jumpSpeed = 17;

class Player {
  constructor(pos) {
    this.pos = pos.plus(new Vector(0, -0.5));
    this.size = new Vector(0.8, 1.5);
    this.speed = new Vector(0, 0);
    this.type = "player"
  }
  moveX(step, level, keys) {
    this.speed.x = 0;
    if (keys.left) {this.speed.x -= playerXSpeed;}
    if (keys.right) {this.speed.x += playerXSpeed;}

    let motion = new Vector(this.speed.x * step, 0);
    let newPos = this.pos.plus(motion);
    let obstacle = level.obstacleAt(newPos, this.size);
    if (obstacle)
      level.playerTouched(obstacle);
    else
      this.pos = newPos;
  }
  moveY(step, level, keys) {
    this.speed.y += step * gravity;
    let motion = new Vector(0, this.speed.y * step);
    let newPos = this.pos.plus(motion);
    let obstacle = level.obstacleAt(newPos, this.size);
    if (obstacle) {
      level.playerTouched(obstacle);
      if (keys.up && this.speed.y > 0)
        this.speed.y = -jumpSpeed;
      else
        this.speed.y = 0;
    } else {
      this.pos = newPos;
    }
  }
  act(step, level, keys) {
    this.moveX(step, level, keys);
    this.moveY(step, level, keys);

    let otherActor = level.actorAt(this);
    if (otherActor)
      level.playerTouched(otherActor.type, otherActor);

    // Losing animation
    if (level.status == "lost") {
      this.pos.y += step;
      this.size.y -= step;
    }
  }
}

class Lava {
  constructor(pos, ch) {
    this.pos = pos;
    this.size = new Vector(1, 1);
    if (ch == "=") {
      this.speed = new Vector(2, 0);
    } else if (ch == "|") {
      this.speed = new Vector(0, 2);
    } else if (ch == "v") {
      this.speed = new Vector(0, 3);
      this.repeatPos = pos;
    }
    this.type = "lava"
  }
  act(step, level) {
    let newPos = this.pos.plus(this.speed.times(step));
    if (!level.obstacleAt(newPos, this.size)) {
      this.pos = newPos;
    } else if (this.repeatPos) {
      this.pos = this.repeatPos;
    } else {
      this.speed = this.speed.times(-1)
    }
  }
}

let wobbleSpeed = 8, wobbleDist = 0.07;

class Coin {
  constructor(pos) {
    this.basePos = this.pos = pos.plus(new Vector(0.2, 0.1));
    this.size = new Vector(0.6, 0.6);
    this.wobble = Math.random() * Math.PI * 2;
    this.type = "coin"
  }

  act(step) {
    this.wobble += step * wobbleSpeed;
    let wobblePos = Math.sin(this.wobble) * wobbleDist;
    this.pos = this.basePos.plus(new Vector(0, wobblePos));
  }
}


const actorChars = {
  "@": Player,
  "o": Coin,
  "=": Lava, "|": Lava, "v": Lava
}

const maxStep = 0.05;

class Level {
  constructor(plan) {
    this.width = plan[0].length;
    this.height = plan.length;
    this.grid = []; //array of arrays, each inner array is a horiz. line
    this.actors = [];

    for (let y = 0; y < this.height; y++) {
      let line = plan[y], gridLine = [];
      for (let x = 0; x < this.width; x++) {
        let ch = line[x], fieldType = null;
        const Actor = actorChars[ch];
        if (Actor)
          this.actors.push(new Actor(new Vector(x, y), ch));
        else if (ch == "x")
          fieldType = "wall";
        else if (ch == "!")
          fieldType = "lava";
        gridLine.push(fieldType);
      }
      this.grid.push(gridLine);
    }

    this.player = this.actors.filter(function(actor) {
      return actor.type == "player";
    })[0];
    this.status = this.finishDelay = null;
  }
  isFinished() {
    return this.status != null && this.finishDelay < 0;
  }
  obstacleAt(pos, size) {
    let xStart = Math.floor(pos.x);
    let xEnd = Math.ceil(pos.x + size.x);
    let yStart = Math.floor(pos.y);
    let yEnd = Math.ceil(pos.y + size.y);

    if (xStart < 0 || xEnd > this.width || yStart < 0) {
      return "wall";
    }
    if (yEnd > this.height) {
      return "lava";
    }
    for (let y = yStart; y < yEnd; y++) {
      for (let x = xStart; x < xEnd; x++) {
        let fieldType = this.grid[y][x];
        if (fieldType) {
          return fieldType;
        }
      }
    }
  }
  actorAt(actor) {
    for (let i = 0; i < this.actors.length; i++) {
      let other = this.actors[i];
      if (other != actor &&
          actor.pos.x + actor.size.x > other.pos.x &&
          actor.pos.x < other.pos.x + other.size.x &&
          actor.pos.y + actor.size.y > other.pos.y &&
          actor.pos.y < other.pos.y + other.size.y) {
        return other
      }
    }
  }
  animate(step, keys) {
    if (this.status != null)
      this.finishDelay -= step;
    while (step > 0) {
      let thisStep = Math.min(step, maxStep);
      this.actors.forEach(actor => {
        actor.act(thisStep, this, keys);
      }, this);
      step -= thisStep;
    }
  }
  playerTouched(type, actor) {
    if (type == "lava" && this.status == null) {
      this.status = "lost";
      this.finishDelay = 1;
    } else if (type == "coin") {
      this.actors = this.actors.filter(function(other) {
        return other != actor;
      })
      if (!this.actors.some(function(actor) {
        return actor.type == "coin";
      })) {
        this.status = "won";
        this.finishDelay = 1;
      }
    }
  };
}

function elem(name, className) {
  let elem = document.createElement(name);
  if (className) elem.className = className;
  return elem;
}

const scale = 20;

class DOMDisplay {
  constructor(parent, level) {
    this.wrap = parent.appendChild(elem("div", "game"));
    this.level = level;

    this.wrap.appendChild(this.drawBackground());
    this.actorLayer = null;
    this.drawFrame();
  }
  drawBackground() {
    let table = elem("table", "background");
    table.style.width = this.level.width * scale + "px";
    this.level.grid.forEach(function(row) {
      let rowElt = table.appendChild(elem("tr"));
      rowElt.style.height = scale + "px";
      row.forEach(function(type) {
        rowElt.appendChild(elem("td", type));
      });
    });
    return table;
  }
  drawActors() {
    let wrap = elem("div");
    this.level.actors.forEach(function(actor) {
      let rectangle = wrap.appendChild(elem("div", "actor " + actor.type));
      rectangle.style.width = actor.size.x * scale + "px";
      rectangle.style.height = actor.size.y * scale + "px";
      rectangle.style.left = actor.pos.x * scale + "px";
      rectangle.style.top = actor.pos.y * scale + "px";
    });
    return wrap;
  }
  drawFrame() {
    if (this.actorLayer)
      this.wrap.removeChild(this.actorLayer);
    this.actorLayer = this.wrap.appendChild(this.drawActors());
    this.wrap.className = "game " + (this.level.status || "");
    this.scrollPlayerIntoView()
  }
  scrollPlayerIntoView() {
    let width = this.wrap.clientWidth;
    let height = this.wrap.clientHeight;
    let margin = width / 3;

    // The viewport
    let left = this.wrap.scrollLeft, right = left + width;
    let top = this.wrap.scrollTop, bottom = top + height;

    let player = this.level.player;
    let center = player.pos.plus(player.size.times(0.5)).times(scale);

    if (center.x < left + margin)
      this.wrap.scrollLeft = center.x - margin;
    else if (center.x > right - margin)
      this.wrap.scrollLeft = center.x + margin - width;
    if (center.y < top + margin)
      this.wrap.scrollTop = center.y - margin;
    else if (center.y > bottom - margin)
      this.wrap.scrollTop = center.y + margin - height;
  }
  clear() {
    this.wrap.parentNode.removeChild(this.wrap);
  }
}

let arrowCodes = {37: "left", 38: "up", 39: "right"};

function trackKeys(codes) {
  let pressed = Object.create(null);
  function handler(event) {
    if (codes.hasOwnProperty(event.keyCode)) {
      let down = event.type == "keydown";
      pressed[codes[event.keyCode]] = down;
      event.preventDefault();
    }
  }
  addEventListener("keydown", handler);
  addEventListener("keyup", handler);
  return pressed;
}

function runAnimation(frameFunc) {
  let lastTime = null;
  function frame(time) {
    let stop = false;
    if (lastTime != null) {
      let timeStep = Math.min(time - lastTime, 100) / 1000;
      stop = frameFunc(timeStep) === false;
    }
    lastTime = time;
    if (!stop)
      requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

let arrows = trackKeys(arrowCodes);

function runLevel(level, Display, andThen) {
  let display = new Display(document.body, level);
  runAnimation(function(step) {
    level.animate(step, arrows);
    display.drawFrame(step);
    if (level.isFinished()) {
      display.clear();
      if (andThen)
        andThen(level.status);
      return false;
    }
  });
}

function runGame(plans, Display) {
  function startLevel(n) {
    runLevel(new Level(plans[n]), Display, function(status) {
      if (status == "lost")
        startLevel(n);
      else if (n < plans.length - 1)
        startLevel(n + 1);
      else
        console.log("You win!");
    });
  }
  startLevel(0);
}

runGame(GAME_LEVELS, DOMDisplay);
