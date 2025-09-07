// 顯微鏡模型 - 根據三視圖
// 單位：微米 (μm)

// 總體參數
base_l = 400;
base_w = 240;
base_h = 50;
base_chamfer = 10;

main_body_l = 100;
main_body_w = 80 ;
main_body_h = 300;

arm_h = 100;
arm_r = 20;

main_body_base_l = 100;
main_body_base_w = 80;
main_body_base_h = 100;

// 物鏡 
lens_r = 15;
lens_ls = [50, 65, 80];

turret_h = 30;
turret_r = 60;

// 載物臺
stage_z = 200;
stage_l = 200;
stage_w = 150;
stage_h = 15;
stage_hole_r = 12;
stage_base_l = 40;
stage_base_w = 55;
stage_base_h = 60;

// 光圈
aperture_r = 35;
aperture_holes = [10, 20, 30, 40, 50, 60];
disk_h = 15;

eyepiece_tube_h = 290;
eyepiece_diameter = 86;




$fn = 100; // 圓形和圓柱體的細節度

// 主模組
module microscope() {
    //base();
    //main_body();    
    //objective_lenses();    
    //stage();
    aperture_disk();
    //eyepiece();
    //coarse_adjustment_knob();
    //fine_adjustment_knob();

}

// 底部
module base() {
    hull() {
        translate([0, 0, base_h/2]) cube([base_l, base_w, base_h], center=true);

        /*
        translate([base_l/2-base_chamfer, 0, base_h]) cylinder(h = base_h, r = base_chamfer, center=true);
        */
        /*
        translate([-(base_l/2-base_chamfer), 0, 0]) cylinder(h = base_h, r=base_chamfer, center=true);
        */
    }
}

// 主體支架和鏡臂
module main_body() {

    translate([base_l/2 - main_body_l/2, 0, base_h + main_body_h/2]) {
        cube([main_body_l, main_body_w, main_body_h], center=true);
    }

   
    
    // 鏡臂曲線部分
    hull() {

        translate([0, 0, base_h + main_body_h + arm_h
        ]) {
            cube([main_body_l, main_body_w, 1], center=true);
            //cylinder(h=arm_h, r=arm_r, center=true);
        }
        
        translate([base_l/2 - main_body_l/2, 0, base_h + main_body_h]) {
            cube([main_body_l, main_body_w, 1], center=true);            
            //cylinder(h=arm_h, r=arm_r, center=true);
        }
        
    }

    // 主體底座
    translate([-main_body_base_l/2 + main_body_l/2 , 0, base_h + main_body_h + arm_h - main_body_base_h/2 ]) {
        cube([main_body_base_l, main_body_base_w, main_body_base_h], center=true);
    }

}

// 物鏡
module objective_lenses( R=30) {
    n = len(lens_ls);
    base_z = base_h + main_body_h;

    // ---- Step1: 計算第0支物鏡的朝向 ----
    v0 = [R, 0, -lens_ls[0]];

    // 角度
    a = acos( v0[2]*(-1) / norm(v0) );   // dot(v0,[0,0,-1]) 簡化成 v0[2]*(-1)
    axis = cross(v0, [0,0,-1]); //旋轉軸

    // ---- Step2: 先把第0支對準 -z，再平移到原點 ----
    translate([-25,0,base_z])   // 這裡用 -R，保證第0支在 x=0
    rotate(a=a, v=axis)
    for (i = [0:n-1]) {
        angle = 360*i/n;
        x = R * cos(angle);
        y = R * sin(angle);
        lens_l = lens_ls[i];

        translate([x,y,0]) {
            lookat = [x, y, -lens_l];
            rotate(a=acos(lookat[2]/norm(lookat)),
                   v=[-lookat[1], lookat[0], 0])
                cylinder(h=lens_l, r=lens_r, center=false);
        }
    }

    translate([-25, 0, base_z]) {
        rotate(a=a, v=axis)
            cylinder(h = turret_h, r = turret_r, center=true);
    }
    
}


// 載物台
module stage() {    
    // 台子
    difference() {
        translate([0, 0, stage_z]) {
            cube([stage_l, stage_w, stage_h], center=true);
        }
        translate([0,0,stage_z]){
            cylinder(h=stage_h+2, r=stage_hole_r, $fn=64, center=true);
        }    
    }
    
    
    // 台子基座
    translate([stage_l/2 - stage_base_l/2, 0, stage_z - stage_h/2 -  stage_base_h/2 ]) {
        cube([stage_base_l, stage_base_w, stage_base_h], center=true);
    }
}

// 光圈圓盤
module aperture_disk() {
    z_trans = 2.25-0.4-0.15;
    center = [2,0,z_trans];
    
    difference() {
        translate(center) 
            cylinder(h = disk_h, r = aperture_r, $fn=64, center=true);
        for(i=[0:5]) {
            angle = i*360 / len(aperture_holes);
            length = center[0];
            r_hole = aperture_holes[i];
            x = center[0] + cos(angle)*length;
            y = center[1] + sin(angle)*length;
            translate([x, y, z_trans])
                cylinder(h=disk_h+3, r=r_hole, $fn=32, center=true);
        }
    }
}
// 目鏡
module eyepiece() {
    translate([0, 0, base_h + 260 + stage_w/2 + 1000 + eyepiece_tube_h/2 + 20]) {
        cylinder(h=eyepiece_tube_h, r=eyepiece_diameter/2, center=true);
    }
    
    // 目鏡上方筒
    translate([0, 0, base_h + 260 + stage_w/2 + 1000 + eyepiece_tube_h + 20 + 200/2]) {
        cylinder(h=200, r=200, center=true);
    }
}

// 粗調節輪
module coarse_adjustment_knob() {
    translate([1600, base_w/2, base_h + 260/2 + 50]) {
        rotate([0, 90, 0]) {
            cylinder(h=150, r=300, center=true);
        }
    }
    translate([1600, -base_w/2, base_h + 260/2 + 50]) {
        rotate([0, 90, 0]) {
            cylinder(h=150, r=300, center=true);
        }
    }
}

// 細調節輪
module fine_adjustment_knob() {
    translate([1600, base_w/2, base_h + 260/2 + 50]) {
        rotate([0, 90, 0]) {
            cylinder(h=150, r=150, center=true);
        }
    }
    translate([1600, -base_w/2, base_h + 260/2 + 50]) {
        rotate([0, 90, 0]) {
            cylinder(h=150, r=150, center=true);
        }
    }
}

// 渲染顯微鏡
microscope();
