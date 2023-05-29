var tadpoleBreed;
var netBreed;
var arrowBreed;
var scoopBreed;

function startup() {
  setup();
}

function setup() {
  clearAll();
  resetTicks();
  setupPatches();
  setupTadpoles();
}

function setupPatches() {
  patches.forEach(function (patch) {
    patch.setColor(cyan + 4);
    if (patch.pycor < 35) {
      patch.setColor(blue);
    }
    if (patch.pycor < 37 && patch.pxcor > 50) {
      patch.setColor(brown - 2);
    }
    if (Pond_Size === "Small" && patch.pycor < 20) {
      patch.setColor(brown - 2);
    }
    if (Pond_Size === "Medium" && patch.pycor < 10) {
      patch.setColor(brown - 2);
    }
    if (patch.pycor >= 37 && patch.pycor < 47 && patch.pxcor > 51) {
      patch.setColor(black);
    }
    if (
      patch.pxcor > 52 &&
      patch.pxcor < 64 &&
      patch.pycor > 37 &&
      patch.pycor < 47
    ) {
      patch.setColor(blue);
    }
    if (
      patch.pxcor > 70 &&
      patch.pxcor < 90 &&
      patch.pycor > 37 &&
      patch.pycor < 47
    ) {
      patch.setColor(blue);
    }
    if (
      patch.pycor >= 37 &&
      patch.pycor < 47 &&
      patch.pxcor > 64 &&
      patch.pxcor < 70
    ) {
      patch.setColor(cyan + 4);
    }
    if (patch.pycor >= 37 && patch.pycor < 47 && patch.pxcor > 90) {
      patch.setColor(cyan + 4);
    }
  });
}

function setupTadpoles() {
  if (Population_Size === "Small") {
    createTadpole(25, function (tadpole) {
      tadpole.setShape("tadpoleR");
      tadpole.setYCor(25 + random(10));
      tadpole.setXCor(3 + random(45));
      tadpole.setSize(2);
      tadpole.setColor(green);
    });
  }
  if (Population_Size === "Medium") {
    createTadpole(100, function (tadpole) {
      tadpole.setShape("tadpoleR");
      tadpole.setYCor(25 + random(10));
      tadpole.setXCor(3 + random(45));
      tadpole.setSize(2);
      tadpole.setColor(green);
    });
  }
  if (Population_Size === "Large") {
    createTadpole(250, function (tadpole) {
      tadpole.setShape("tadpoleR");
      tadpole.setYCor(25 + random(10));
      tadpole.setXCor(3 + random(45));
      tadpole.setSize(2);
      tadpole.setColor(green);
    });
  }
  createNet(1, function (net) {
    net.setXCor(85);
    net.setYCor(20);
    net.setShape("net");
    net.setSize(5);
  });
  createNet(1, function (net) {
    net.setXCor(86);
    net.setYCor(15);
    net.setShape("net");
    net.setSize(8);
  });
  createNet(1, function (net) {
    net.setXCor(87);
    net.setYCor(10);
    net.setShape("net");
    net.setSize(11);
  });
  createArrow(1, function (arrow) {
    arrow.setSize(4);
    arrow.setHeading(90);
    arrow.setColor(orange);
    arrow.setXCor(79);
    if (net_Size === "Small") {
      arrow.setYCor(20);
    }
    if (net_Size === "Medium") {
      arrow.setYCor(15);
    }
    if (net_Size === "Large") {
      arrow.setYCor(10);
    }
  });
}

function go() {
  moveTadpoles();
  scoop.forEach(function (s) {
    s.die();
  });
}

function moveTadpoles() {
  tadpole.forEach(function (t) {
    var patchAheadColor = t.patchAhead(1.8).pcolor;
    if (patchAheadColor === blue) {
      t.fd(0.5);
      t.setHeading(t.heading + random(20) - random(20));
    } else {
      t.setHeading(t.heading + 190 - random(-20));
    }
    if (t.heading < 180) {
      t.setShape("tadpoleR");
    } else {
      t.setShape("TadpoleL");
    }
  });
}

function dipNet() {
  createScoop(1, function (scoop) {
    scoop.setXCor(25);
    scoop.setYCor(26);
    scoop.setShape("Net");
    if (net_Size === "Small") {
      scoop.setSize(5);
      tadpole.inRadius(3, function (t) {
        t.setXCor(57);
        t.setYCor(42);
      });
    }
    if (net_Size === "Medium") {
      scoop.setSize(8);
      tadpole.inRadius(6, function (t) {
        t.setXCor(57);
        t.setYCor(42);
      });
    }
    if (net_Size === "Large") {
      scoop.setSize(11);
      tadpole.inRadius(9, function (t) {
        t.setXCor(57);
        t.setYCor(42);
      });
    }
  });
}

function release() {
  tadpole
    .with(function (t) {
      return t.xcor > 51 && t.xcor < 67;
    })
    .forEach(function (t) {
      t.setXCor(25);
      t.setYCor(30);
    });
}

function hold() {
  tadpole
    .with(function (t) {
      return t.xcor > 51 && t.xcor < 67;
    })
    .forEach(function (t) {
      t.setXCor(80);
      t.setYCor(42);
    });
}

function emptyPen() {
  tadpole
    .with(function (t) {
      return t.xcor > 68;
    })
    .forEach(function (t) {
      t.setXCor(25);
      t.setYCor(30);
    });
}

function mark() {
  var markedTadpoles = tadpole.filter(function (t) {
    return t.xcor > 51 && t.xcor < 67 && t.color === green;
  });
  if (markedTadpoles.length > 0) {
    var randomTadpole = randomOneOf(markedTadpoles);
    randomTadpole.setColor(red);
  }
}

function unmark() {
  var unmarkedTadpoles = tadpole.filter(function (t) {
    return t.xcor > 51 && t.xcor < 67 && t.color === red;
  });
  if (unmarkedTadpoles.length > 0) {
    var randomTadpole = randomOneOf(unmarkedTadpoles);
    randomTadpole.setColor(green);
  }
}

function unmarkAll() {
  tadpole
    .with(function (t) {
      return t.color === red;
    })
    .forEach(function (t) {
      t.setColor(green);
    });
}
