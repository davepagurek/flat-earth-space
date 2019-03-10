const G = 10;

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

  collisionWith(r, pos) {
    const distSq = pos.copy().sub(this.pos).magSq();
    return distSq <= (r + this.r) * (r + this.r) && Math.abs(pos.y - this.pos.y) < 2;
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

    fill('#FFF');
    stroke(0);

    const points = 30;
    beginShape();
    for (let i = 0; i < points; i++) {
      vertex(this.r * Math.cos(i*2*Math.PI/points), 0, this.r * Math.sin(i*2*Math.PI/points));
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
    objects.forEach(o => {
      if (this.crashed || this === o) return;

      if (o.collisionWith(this.r, this.pos)) {
        this.crashed = true;
      }
    });
  }

  collisionWith(r, pos) {
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
    fill('#FFF');
    stroke(0);
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
}

let objects = [];
let sfx = [];

function setup() {
  createCanvas(400, 400, WEBGL);
  objects.push(new Disc(100, createVector(0, 0, 0), 100));
  objects.push(new FixedSphere(20, createVector(0, -240, 0), 80));
  objects.push(new Sphere(1, createVector(0, -35, 0), createVector(2, -4, 0), 1));
}

let cameraY = 0;
let cameraZ = 80;
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
    cameraY += (avgY - cameraY) / 4;

    maxX = objects.reduce((accum, o) => Math.max(accum, Math.abs(o.avgX())), 0);
    const targetZ = 100 * maxX;
    cameraZ += (maxX - cameraZ) / 4;
  }

  translate(0, -cameraY, -cameraZ);
  background(200);
  objects.forEach(o => o.render());
  sfx.forEach(o => o.render());

  if (nextLoc !== null) {
    noStroke();
    fill('#F0F');

    push();
    translate(nextLoc.x, nextLoc.y, nextLoc.z);
    sphere(3);

    stroke(0);
    line(0, 0, 0, nextVel.x, nextVel.y, nextVel.z);
    pop();
  }
}

const worldMousePos = () => createVector(mouseX - width/2, mouseY - height/2, 0);

function mousePressed() {
  nextLoc = worldMousePos();
  nextVel = createVector(0, 0, 0);
}

function mouseDragged() {
  if (nextLoc !== null) {
    nextVel = worldMousePos().sub(nextLoc);
    console.log(nextVel);
  }
}

function mouseReleased() {
  if (nextLoc !== null) {
    objects.push(new Sphere(1, nextLoc, nextVel.div(10), 1));
    nextLoc = null;
    nextVel = null;
  }
}
