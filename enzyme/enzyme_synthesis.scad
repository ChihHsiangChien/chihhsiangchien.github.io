// enzyme_synthesis.scad
// 合成作用酵素與受質

// 受質1（左側橢圓小分子）
module substrate1_synthesis() {
    color("saddlebrown")
    translate([-4, 0, 0]) scale([1.2,1,1]) cylinder(h=2, r=2, center=true, $fn=60);
}

// 受質2（右側橢圓小分子）
module substrate2_synthesis() {
    color("peru")
    translate([4, 0, 0]) scale([0.8,1,1]) cylinder(h=2, r=2, center=true, $fn=60);
}

// 酵素（下方深色雙凹槽）
module enzyme_synthesis() {
    difference() {
        // 主體
        color("saddlebrown") cube([14, 7, 3], center=true);
        // 左凹槽
        translate([-3, 2, 1]) scale([1.2,1,1]) cylinder(h=3.2, r=2.2, center=true, $fn=60);
        // 右凹槽
        translate([3, 2, 1]) scale([0.8,1,1]) cylinder(h=3.2, r=2.2, center=true, $fn=60);
    }
}

// 渲染
substrate1_synthesis();
substrate2_synthesis();
translate([0, -10, 0]) enzyme_synthesis();
