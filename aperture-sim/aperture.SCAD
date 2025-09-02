// 載物臺
module stage() {
    stage_hole_r = 0.6;
    difference() {
        translate([0,0,2.25])
            cube([10,10,0.5], center=true);
        translate([0,0,2.5])
            cylinder(h=1, r=stage_hole_r, $fn=64, center=true);
    }
}

// 光圈圓盤
module aperture_disk() {
    aperture_r = 3.5;
    aperture_holes = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6];
    z_trans = 2.25-0.4-0.15;
    center = [2,0,z_trans];
    difference() {
        translate(center) 
            cylinder(h=0.3, r=aperture_r, $fn=64, center=true);
        for(i=[0:5]) {
            angle = i*360/len(aperture_holes);
            length = center[0];
            r_hole = aperture_holes[i];
            x = center[0] + cos(angle)*length;
            y = center[1] + sin(angle)*length;
            translate([x, y, z_trans])
                cylinder(h=0.4, r=r_hole, $fn=32, center=true);
        }
    }
}
stage();