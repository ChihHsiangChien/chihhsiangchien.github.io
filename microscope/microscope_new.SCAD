// 顯微鏡模型 - 根據三視圖
// 單位：微米 (μm)

// 總體參數
base_l = 380;
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
lens_l = [50, 65, 80];

turret_h = 30;
turret_r = 60;

// 載物臺
stage_z = 200;
stage_l = 200;
stage_w = 200;
stage_h = 15;
stage_hole_r = 12;
stage_base_l = 20;
stage_base_w = 55;
stage_base_h = 60;

// 光圈
disk_r = 75;
disk_y_offset = -40;
aperture_holes = [4, 6, 8, 10, 12, 14];
disk_h = 10;

// 粗調節輪
big_knob_r = 50;
big_knob_h = 40;
knob_z = 150;

// 細調節輪
small_knob_r = 30;
small_knob_h = 20;

// 目鏡
eyepiece_tube_h = 200;
eyepiece_diameter = 30;

// 光源
light_tube_r = 50;
light_tube_h = 30;
light_hole_r = 35;




$fn = 100; // 圓形和圓柱體的細節度

// 主模組
module microscope() {

    base();
    main_body();    

    

    objective_lenses();    


    
    stage();    

    aperture_disk();
    
    big_knob();

    
    small_knob();

    
    eyepiece();
    eyepiece_base();


    light_plate();


}

// 底部
module base() {
    union() {
        translate([0, 0, base_h/2]) {
            cube([base_l, base_w, base_h], center=true);
            };
        difference(){
            translate([0, 0, base_h + light_tube_h/2]) {
                cylinder(h = light_tube_h, r = light_tube_r,  center=true);}
            translate([0, 0, base_h + light_tube_h/2]) {
                cylinder(h = light_tube_h+1, r = light_hole_r,  center=true);}                
        }

    }
}
module light_plate(){
    union(){
        translate([0, 0, base_h + light_tube_h/2-5]) cylinder(h = light_tube_h, r = light_hole_r,  center=true);
        
        translate([0,0,stage_z]){
            cylinder(h=stage_h, r=stage_hole_r, $fn=64, center=true);
        }       
    } 
}

// 主體支架和鏡臂
module main_body() {
    

    translate([base_l/2 - main_body_l/2, 0, base_h + main_body_h/2]) {
        cube([main_body_l, main_body_w, main_body_h], center=true);
    }

   
    z1 = base_h + main_body_h + arm_h;
    z2 = base_h + main_body_h;
    // 鏡臂曲線部分
    hull() {
        translate([0, 0, z1]) {
            cube([main_body_l, main_body_w, 1], center=true);
            //cylinder(h=arm_h, r=arm_r, center=true);
        }
        
        translate([base_l/2 - main_body_l/2, 0, z2]) {
            cube([main_body_l, main_body_w, 1], center=true);            
            //cylinder(h=arm_h, r=arm_r, center=true);
        }
        
    }

    // 主體底座
    translate([-main_body_base_l/2 + main_body_l/2 , 0, base_h + main_body_h + arm_h - main_body_base_h/2 ]) {
        cube([main_body_base_l, main_body_base_w, main_body_base_h], center=true);
    }

}
// -------- 自訂點積函數 --------
function dot(v1, v2) = v1[0]*v2[0] + v1[1]*v2[1] + v1[2]*v2[2];

// -------- 工具函數：把向量 v 依照 axis 旋轉 a 度 --------
function rotate_vector(v, a, axis) =
    let(
        u = axis / norm(axis),               // 單位化軸
        cosA = cos(a),
        sinA = sin(a)
    )
    v*cosA + cross(u,v)*sinA + u*dot(u,v)*(1-cosA);


// 物鏡
module objective_lenses( R=30) {
    n = len(lens_l);
    base_z = base_h + main_body_h;

    // ---- Step1: 計算第0支物鏡的朝向 ----
    v0 = [R, 0, -lens_l[0]];

    // 角度
    a = acos( v0[2]*(-1) / norm(v0) );   // dot(v0,[0,0,-1]) 簡化成 v0[2]*(-1)
    axis = cross(v0, [0,0,-1]); // 旋轉校正軸
    echo(str("校正軸 = ", axis));
    echo(str("angle = ", a));


    // Step2: 算出鼻輪旋轉軸 (原本是 [0,0,1]，旋轉後的方向)
    turret_axis = rotate_vector([0,0,1], a, axis);
    echo(str("鼻輪旋轉軸 = ", turret_axis));


    // ---- Step2: 先把第0支對準 -z，再平移到原點 ----
    translate([-25,0,base_z])   // 這裡用 -R，保證第0支在 x=0
    rotate(a=a, v=axis)
    for (i = [0:n-1]) {
        angle = 360*i/n;
        x = R * cos(angle);
        y = R * sin(angle);
        lens_l = lens_l[i];

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
    disk_z = stage_z - stage_h/2- disk_h/2;
    center = [0,disk_y_offset,disk_z];


    difference() {
        translate(center) 
            cylinder(h = disk_h, r = disk_r, $fn=64, center=true);
        for(i=[0:5]) {
            angle = i*360 / len(aperture_holes) + 30;
            //length = disk_r - 5 - max(aperture_holes);
            length = -center[1];
            r_hole = aperture_holes[i];
            x = center[0] + cos(angle)*length;
            y = center[1] + sin(angle)*length;
            translate([x, y, disk_z])
                cylinder(h=disk_h+3, r=r_hole, $fn=32, center=true);
        }
    }

}


// 粗調節輪（側面淺孔版）
module big_knob() {
    knob_x = base_l/2 - main_body_l/2;
    knob_y = main_body_w/2 + big_knob_h/2 ;
    knob_depth = big_knob_h / 5 ; // 圓孔深度
    hole_r = big_knob_r / 6;     // 圓孔半徑
    offset = big_knob_r - hole_r - 4; // 側面孔距離旋鈕中心
    

    union(){
        translate([knob_x, knob_y, knob_z]) {
            rotate([90, 0, 0]) { // 將孔旋轉到側面
                difference(){                
                    cylinder(h=big_knob_h, r=big_knob_r, center=true);
                    // 側面淺孔
                    translate([0, offset, -big_knob_h/2])
                        cylinder(h=knob_depth, r=hole_r, center=true);
                }
            }
        }

        translate([knob_x, -knob_y, knob_z]) {
            rotate([90, 0, 0]) {
                difference(){
                    cylinder(h=big_knob_h, r=big_knob_r, center=true);
                    // 側面淺孔
                    translate([0, offset, big_knob_h/2])
                        cylinder(h=knob_depth, r=hole_r, center=true);
                }
            }
        }    
    }
}

// 細調節輪
module small_knob() {
    knob_x = base_l/2 - main_body_l/2;
    knob_y = main_body_w/2 + big_knob_h + small_knob_h/2;
    knob_depth = small_knob_h / 5 ; // 圓孔深度
    hole_r = small_knob_r / 6;     // 圓孔半徑
    offset = small_knob_r - hole_r - 5; // 側面孔距離旋鈕中心
    

    union(){
        translate([knob_x, knob_y, knob_z]) {
            rotate([90, 0, 0]) { // 將孔旋轉到側面
                difference(){                
                    cylinder(h=small_knob_h, r=small_knob_r, center=true);
                    // 側面淺孔
                    translate([0, offset, -small_knob_h/2])
                        cylinder(h=knob_depth, r=hole_r, center=true);
                }
            }
        }

        translate([knob_x, -knob_y, knob_z]) {
            rotate([90, 0, 0]) {
                difference(){
                    cylinder(h=small_knob_h, r=small_knob_r, center=true);
                    // 側面淺孔
                    translate([0, offset, small_knob_h/2])
                        cylinder(h=knob_depth, r=hole_r, center=true);
                }
            }
        }    
    }
}
// 目鏡
module eyepiece() {
    angle = 45;
    eyepiece_z = base_h + main_body_h + arm_h + eyepiece_tube_h*sin(angle);


    // 先算目鏡底部位置
    base_pos = [-eyepiece_tube_h*sin(angle)+40, 0, base_h + main_body_h + arm_h + 100];

    
    translate(base_pos) {
        rotate([0,-angle,0]){
            cylinder(h=eyepiece_tube_h, r=eyepiece_diameter, center=true);
        }
    }

}

// 目鏡底座
module eyepiece_base(){
    angle = 45;
    base_pos = [-eyepiece_tube_h*sin(angle)+90, 0, base_h + main_body_h + arm_h +50];
    z2 = base_h + main_body_h + arm_h;    


    hull() {
    translate(base_pos) {
        rotate([0, -angle, 0]) {
            cylinder(h=10, r=40, center=true);
        }
    }
    

    translate([0, 0, z2]) {
        cylinder(h=20, r=40, center=true);
        //cylinder(h=arm_h, r=arm_r, center=true);
    }
}
    

}
// 渲染顯微鏡
microscope();
