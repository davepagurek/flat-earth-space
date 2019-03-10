const G = 10;
let moon, earth;
function preload() {
  moon = loadImage('assets/moon.png');
  earth = loadImage('assets/earth.png');
}

class Explotion {
  constructor(pos) {
    this.pos = pos;
    this.life = 0;
    this.maxLife = 30;
  }

  tick() {
    this.life++;
  }

  done() {
    return this.life >= 30;
  }

  render() {
    push();
    translate(this.pos.x, this.pos.y, this.pos.z);
    noStroke();
    fill('#FA0');
    sphere(15*Math.sin(this.life/this.maxLife * Math.PI) + 3);
    pop();
  }
}

class Disc {
  constructor(r, pos, m) {
    this.r = r;
    this.pos = pos;
    this.m = m;

    const rSq = r * r;

    this.samplePoints = [];
    while (this.samplePoints.length < 50) {
      const p = createVector(
        this.r * (Math.random() * 2 - 1),
        0,
        this.r * (Math.random() * 2 - 1)
      );

      if (p.magSq() <= rSq) {
        this.samplePoints.push(p);
      }
    }
  }

  forceOn(mass, position) {
    const force = createVector(0, 0, 0);
    this.samplePoints.forEach(p => {
      const direction = p.copy().add(this.pos).sub(position);
      const magnitude = G * (this.m / this.samplePoints.length) * mass / direction.magSq();
      force.add(direction.setMag(magnitude));
    });

    return force;
  }

  calculateForce() {}

  checkCollisions() {}

  update() {}

  collisionWith(r, pos, nextPos) {
    const distSq = pos.copy().sub(this.pos).magSq();
    let closeEnough = Math.abs(pos.y - this.pos.y) < 2;
    closeEnough = closeEnough || ((pos.y - this.pos.y) * (nextPos.y - this.pos.y) < 0);
    return distSq <= (r + this.r) * (r + this.r) && closeEnough;
  }


  done() {
    return false;
  }

  makeSFX() { return []; }

  avgY() { return this.pos.y; }
  avgX() { return this.r; }

  render() {
    push();

    translate(this.pos.x, this.pos.y, this.pos.z);

    noStroke();
    texture(earth);

    const points = 30;
    beginShape();
    for (let i = 0; i < points; i++) {
      const u = Math.cos(i*2*Math.PI/points);
      const v = Math.sin(i*2*Math.PI/points);
      vertex(this.r * u, 0, this.r * v, u*0.5 + 0.5, v*0.5 + 0.5);
    }
    endShape(CLOSE);

    pop();
  }
}

class Sphere {
  constructor(r, pos, vel, m) {
    this.r = r;
    this.pos = pos;
    this.vel = vel;
    this.m = m;
    this.crashed = false;
  }

  calculateForce(objects) {
    this.nextForce = createVector(0, 0, 0);

    objects.forEach(o => {
      if (this === o) return;

      this.nextForce.add(o.forceOn(this.m, this.pos));
    });
  }

  update() {
    // a = F/m
    this.vel.add(this.nextForce.div(this.m));
    this.pos.add(this.vel);
  }

  forceOn(mass, position) {
    const direction = this.pos.copy().sub(position);
    const magnitude = G * this.m * mass / direction.magSq();
    return direction.setMag(magnitude);
  }

  checkCollisions(objects) {
    const nextPos = this.pos.copy().add(this.vel);
    objects.forEach(o => {
      if (this.crashed || this === o) return;

      if (o.collisionWith(this.r, this.pos, nextPos)) {
        this.crashed = true;
      }
    });
  }

  collisionWith(r, pos, nextPos) {
    const distSq = pos.copy().sub(this.pos).magSq();
    return distSq <= (r + this.r) * (r + this.r);
  }

  done() {
    return this.crashed || Math.abs(this.pos.x) > 500;
  }

  makeSFX() {
    if (this.crashed) {
      return [ new Explotion(this.pos) ];
    } else {
      return [];
    }
  }

  avgY() { return this.pos.y; }
  avgX() { return this.pos.x; }

  render() {
    push();
    translate(this.pos.x, this.pos.y, this.pos.z);
    fill(255, 255, 255);
    noStroke();
    sphere(this.r);
    pop();
  }
}

class FixedSphere extends Sphere {
  constructor(r, pos, m) {
    super(r, pos, null, m);
  }

  update() {}
  calculateForce() {}
  checkCollisions() {}

  render() {
    push();
    translate(this.pos.x, this.pos.y, this.pos.z);
    noStroke();
    texture(moon)
    sphere(this.r);
    pop();
  }
}

let objects = [];
let sfx = [];
let stars = [];
const earthWidth = 100;

function setup() {
  createCanvas(400, 400, WEBGL);
  objects.push(new Disc(earthWidth, createVector(0, 0, 0), 100));
  objects.push(new FixedSphere(20, createVector(0, -240, 0), 80));
  objects.push(new Sphere(3, createVector(0, -35, 0), createVector(2, -4, 0), 1));

  for (let i = 0; i < 80; i++) {
    stars.push(createVector(Math.random() * 1000 - 500, Math.random() * 10000 - 5000, -Math.random() * 200 - 100));
  }
}

const drawStars = () => {
  noStroke();
  fill('#FFF');
  stars.forEach(s => {
    push();
    translate(s.x, s.y, s.z);
    sphere(2);
    pop();
  });
}

let cameraY = 0;
let cameraZ = 80;
let nextMouse = null;
let nextLoc = null;
let nextVel = null;

function draw() {
  if (nextLoc === null) {
    objects.forEach(o => o.calculateForce(objects));
    objects.forEach(o => o.update());
    objects.forEach(o => o.checkCollisions(objects));
    objects.forEach(o => sfx = sfx.concat(o.makeSFX()))
    objects = objects.filter(o => !o.done())

    sfx.forEach(o => o.tick());
    sfx = sfx.filter(o => !o.done());

    let avgY = 0;
    if (objects.length > 2) {
      avgY = objects.slice(2).reduce((accum, o) => accum + o.avgY(), 0) / (objects.length - 2);
    }
    cameraY += (avgY - cameraY) / 12;

    maxX = objects.reduce((accum, o) => Math.max(accum, Math.abs(o.avgX())), 0);
    const targetZ = 100 * maxX;
    cameraZ += (maxX - cameraZ) / 12;
  }

  translate(0, -cameraY, -cameraZ);
  rotateX(-0.1);
  background(0);
  if (nextLoc !== null) {
    fill(255, 0, 255);
    noStroke();

    push();
    translate(nextLoc.x, nextLoc.y, nextLoc.z);
    sphere(3);

    push();
    rotateZ(-Math.PI/2);
    rotateZ(Math.atan2(nextVel.y, nextVel.x));
    const mag = nextVel.mag();
    translate(0, mag/2, 0);
    scale(2, mag, 2);
    fill(255, 0, 255);
    noStroke();
    cylinder(1, 1);
    pop();
    pop();
  }
  objects.forEach(o => o.render());
  sfx.forEach(o => o.render());
  drawStars();
}

const worldMousePos = () => createVector(mouseX - width/2, mouseY - height/2 + cameraY/10, 0);

function mousePressed() {
  nextMouse = worldMousePos();
  nextLoc = createVector(Math.min(earthWidth, Math.max(-earthWidth, nextMouse.x)), 0, 0);
  nextVel = createVector(0, 0, 0);
}

function mouseDragged() {
  if (nextLoc !== null) {
    nextVel = worldMousePos().sub(nextMouse);
  }
}

function mouseReleased() {
  if (nextLoc !== null) {
    objects.push(new Sphere(3, nextLoc, nextVel.div(10), 1));
    nextLoc = null;
    nextMouse = null;
    nextVel = null;
  }
}
