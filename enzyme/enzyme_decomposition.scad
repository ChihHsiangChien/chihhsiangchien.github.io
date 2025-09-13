// enzyme_decomposition.scad
// 分解作用酵素與受質

// 受質（上方綠色十字形）
module substrate_decomposition() {
    color("green")
    rotate([0,0,90])
    union() {
        cube([6, 3, 2], center=true);
        translate([0, 2.5, 0]) 
        cube([3, 3, 2], center=true);
    }
}

// 酵素（下方灰色凹槽）
module enzyme_decomposition() {
    difference() {
        // 主體
        color("gray") 
        cube([12, 6, 3], center=true);
        

        // 用受質形狀產生凹槽
        translate([0, 2, 1]) substrate_decomposition();
          
    }
}

// 渲染
translate([0, 15, 0]) substrate_decomposition();
enzyme_decomposition();
