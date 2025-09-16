//
// Parametric Chloroplast in OpenSCAD (修正版)
// by ChatGPT
// -------------------------------------------------------------

$fn = 48;
seed = 12345;                     // 隨機種子

show_envelope      = false;
show_stroma        = true;
show_grana         = true;
show_lamellae      = true;
show_starch        = false;
show_nucleoid      = false;
show_ribosomes     = false;

// ----------------- 葉綠體幾何參數 -----------------
a = 5.0;    // 半長軸
b = 2.8;    // 半寬軸
c = 2.0;    // 半厚軸

membrane_thickness = 0.06;
intermembrane_gap  = 0.03;
inner_offset = membrane_thickness + intermembrane_gap;

grana_count     = 30;
thylakoid_r     = 0.20;
thylakoid_h     = 0.06;
grana_height    = 1.0;
grana_discs_min = 8;
grana_discs_max = 16;
grana_margin    = 0.5;

lamellae_count  = 15;
lamellae_w      = 0.06;
lamellae_h      = 0.12;
lamellae_r      = 0.18;

starch_count    = 3;
starch_r_range  = [0.25, 0.45];
starch_margin   = 0.6;

nucleoid_size   = [0.9, 0.6, 0.4];

ribosome_count  = 120;
ribosome_r      = 0.035;

// ----------------- 顏色 -----------------
col_envelope = [0.22, 0.65, 0.28, 0.5];
col_inner    = [0.28, 0.78, 0.35, 0.8];
col_stroma   = [0.7, 1.0, 0.7, 0.15];
col_grana    = [0.1, 0.5, 0.1, 1.0];
col_lamellae = [0.15, 0.6, 0.15, 1.0];
col_starch   = [1.0, 1.0, 0.8, 0.9];
col_nucleoid = [0.95, 0.85, 0.95, 0.6];
col_ribo     = [0.6, 0.9, 0.6, 1.0];

// ----------------- 工具函式 -----------------
module ellipsoid(ra, rb, rc) {
    scale([ra, rb, rc]) sphere(1);
}

function inner_axes() = [
    a - inner_offset - membrane_thickness,
    b - inner_offset - membrane_thickness,
    c - inner_offset - membrane_thickness
];

function rand(a0, a1, n=1, s=seed) = rands(a0, a1, n, s)[0];
function rand3(a0, a1, s=seed) = [
    rands(a0, a1, 1, s+11)[0],
    rands(a0, a1, 1, s+23)[0],
    rands(a0, a1, 1, s+47)[0]
];

// 向量逐元素相乘
function vmul(a,b) = [a[0]*b[0], a[1]*b[1], a[2]*b[2]];

function clamp_inside_ellipsoid(p, margin=0) = 
    let(ax = inner_axes()[0]-margin,
        by = inner_axes()[1]-margin,
        cz = inner_axes()[2]-margin,
        t  = sqrt((p[0]*p[0])/(ax*ax) + (p[1]*p[1])/(by*by) + (p[2]*p[2])/(cz*cz)))
    (t <= 1 ? p : [p[0]/t, p[1]/t, p[2]/t]);

function vsub(a,b) = [a[0]-b[0], a[1]-b[1], a[2]-b[2]];
function vlen(v) = sqrt(v[0]*v[0]+v[1]*v[1]+v[2]*v[2]);

function cross(a,b) = [
    a[1]*b[2]-a[2]*b[1],
    a[2]*b[0]-a[0]*b[2],
    a[0]*b[1]-a[1]*b[0]
];
function normalize(v) = let(L=vlen(v)) (L==0 ? [0,0,1] : [v[0]/L, v[1]/L, v[2]/L]);

function look_at_z(v) = 
    let(
        vz = v / vlen(v),
        up = [0,0,1],
        u  = (abs(vz[2])>0.999) ? [1,0,0] : up,
        vx = normalize(cross(u, vz)),
        vy = cross(vz, vx)
    )
    [[vx[0], vy[0], vz[0], 0],
     [vx[1], vy[1], vz[1], 0],
     [vx[2], vy[2], vz[2], 0],
     [0     , 0     , 0     , 1]];

// ----------------- 模組 -----------------
module chloroplast_envelope() {
    color(col_envelope)
    difference() {
        ellipsoid(a, b, c);
        scale([ (a - membrane_thickness)/a,
                (b - membrane_thickness)/b,
                (c - membrane_thickness)/c ]) ellipsoid(a, b, c);
    }

    inner_a = a - inner_offset;
    inner_b = b - inner_offset;
    inner_c = c - inner_offset;

    color(col_inner)
    difference() {
        ellipsoid(inner_a, inner_b, inner_c);
        scale([ (inner_a - membrane_thickness)/inner_a,
                (inner_b - membrane_thickness)/inner_b,
                (inner_c - membrane_thickness)/inner_c ]) ellipsoid(inner_a, inner_b, inner_c);
    }
}

module stroma_fill() {
    s = inner_axes();
    color(col_stroma)
    scale([ (s[0]-0.05), (s[1]-0.05), (s[2]-0.05) ]) sphere(1);
}

module grana_stack(h=grana_height, r=thylakoid_r, t=thylakoid_h, discs=12) {
    spacing = (discs>1) ? (h - discs*t)/(discs-1) : 0;
    color(col_grana)
    for (i=[0:discs-1]) {
        z0 = -h/2 + i*(t+spacing);
        translate([0,0,z0]) cylinder(h=t, r=r, center=true);
    }
}


function is_far_enough(p, arr, min_dist) =
    len(arr)==0 ? true :
    min([for (q=arr) vlen(vsub(p,q))]) > min_dist;

// 產生不重疊的 grana

function pick_grana(arr, n, min_dist, out=[]) =
    (len(arr)==0|| len(out)==n) ? out :
    let(
        p = arr[0],
        rest = [for (i = [1:len(arr)-1]) arr[i]],
        new_out = is_far_enough(p, out, min_dist) ? concat(out, [p]) : out
    )
    pick_grana(rest, n, min_dist, new_out);

ia = inner_axes();
grana_pos = [
    for (i=[0:grana_count*5-1])
        clamp_inside_ellipsoid(
            [ rands(-1,1,1,seed+i+100)[0]*(ia[0]-grana_margin),
              rands(-1,1,1,seed+i+200)[0]*(ia[1]-grana_margin),
              0
            ],
            grana_margin)
];
    
grana_centers = pick_grana(grana_pos, grana_count, thylakoid_r*3);

module grana_field(n=grana_count, seed0=seed) {
    for (i=[0:len(grana_centers)-1]) {
        p = grana_centers[i];
        v = [0,0,1];
        ang = 0;
        discs = floor(rand(grana_discs_min, grana_discs_max+0.999, 1, seed0+3000+i));
        rr    = thylakoid_r * rand(0.9, 1.15, 1, seed0+4000+i);
        hh    = grana_height * rand(0.7, 1.1, 1, seed0+5000+i);

        translate(p)
        rotate(a=ang, v=v)
            grana_stack(h=hh, r=rr, t=thylakoid_h, discs=discs);
    }
}

module grana_field2(n=grana_count, seed0=seed) {
    ia = inner_axes();
    for (i=[0:n-1]) {
        //p0 = vmul(rand3(-1,1,seed0+i), [ia[0]-grana_margin, ia[1]-grana_margin, ia[2]-grana_margin]);
        // 固定 z=0，只隨機 x, y
        rx = rands(-1,1,1,seed0+i+100)[0];
        ry = rands(-1,1,1,seed0+i+200)[0];
        p0 = [rx*(ia[0]-grana_margin), ry*(ia[1]-grana_margin), 0];
                
        p  = clamp_inside_ellipsoid(p0, grana_margin);

        //v = normalize(rand3(-1,1,seed0+1000+i));
        //ang = 360*rand(0,1,1,seed0+2000+i);

        v = [0,0,1]; // 全部朝 z 軸
        ang = 0;     // 不旋轉

        discs = floor(rand(grana_discs_min, grana_discs_max+0.999, 1, seed0+3000+i));
        rr    = thylakoid_r * rand(0.9, 1.15, 1, seed0+4000+i);
        hh    = grana_height * rand(0.7, 1.1, 1, seed0+5000+i);

        translate(p)
        rotate(a=ang, v=v)
            grana_stack(h=hh, r=rr, t=thylakoid_h, discs=discs);
    }
}

module capsule_between(p1, p2, r) {
    v = vsub(p2, p1);
    L = vlen(v);
    if (L > 0) {
        translate(p1)
        multmatrix(look_at_z(v))
            union() {
                cylinder(h=L, r=r, center=false);
                sphere(r);
                translate([0,0,L]) sphere(r);
            }
    }
}


// lamellae_network 也用 grana_centers
module lamellae_network(n=lamellae_count, seed0=seed) {
    color(col_lamellae)
    for (k=[0:n-1]) {
        i = floor(rand(0, len(grana_centers), 1, seed0+7000+k));
        j = floor(rand(0, len(grana_centers), 1, seed0+8000+k));
        if (i!=j) {
            p1 = grana_centers[i];
            p2 = grana_centers[j];
            L = vlen(vsub(p2,p1));
            if (L > 0.8 && L < 3.5) {
                capsule_between(p1, p2, lamellae_w);
                translate(p1) cylinder(h=lamellae_h, r=lamellae_r, center=true);
                translate(p2) cylinder(h=lamellae_h, r=lamellae_r, center=true);                
            }
        }
    }
}

module lamellae_network2(n=lamellae_count, seed0=seed) {
    ia = inner_axes();
    centers = [ for (i=[0:grana_count-1])
        /*
        clamp_inside_ellipsoid(
            vmul(rand3(-1,1,seed0+i),
                 [ia[0]-grana_margin, ia[1]-grana_margin, ia[2]-grana_margin]),
            grana_margin)
        */
        // 固定 z=0，只隨機 x, y
        clamp_inside_ellipsoid(
            [ rands(-1,1,1,seed0+i+100)[0]*(ia[0]-grana_margin),
              rands(-1,1,1,seed0+i+200)[0]*(ia[1]-grana_margin),
              0
            ],
            grana_margin)        
    ];

    color(col_lamellae)
    for (k=[0:n-1]) {
        i = floor(rand(0, grana_count, 1, seed0+7000+k));
        j = floor(rand(0, grana_count, 1, seed0+8000+k));
        if (i!=j) {
            p1 = centers[i];
            p2 = centers[j];
            L = vlen(vsub(p2,p1));
            if (L > 0.8 && L < 3.5) {
                capsule_between(p1, p2, lamellae_w);
                /*
                translate(p1) rotate(a=90, v=normalize(vsub(p2,p1)))
                    cylinder(h=lamellae_h, r=lamellae_r, center=true);
                translate(p2) rotate(a=90, v=normalize(vsub(p2,p1)))
                    cylinder(h=lamellae_h, r=lamellae_r, center=true);
                */
                translate(p1) 
                    cylinder(h=lamellae_h, r=lamellae_r, center=true);
                translate(p2) 
                    cylinder(h=lamellae_h, r=lamellae_r, center=true);                
            }
        }
    }
}

module starch_granules(n=starch_count, seed0=seed) {
    ia = inner_axes();
    for (i=[0:n-1]) {
        r  = rand(starch_r_range[0], starch_r_range[1], 1, seed0+9000+i);
        p0 = vmul(rand3(-1,1,seed0+10000+i),
                  [ia[0]-starch_margin, ia[1]-starch_margin, ia[2]-starch_margin]);
        p  = clamp_inside_ellipsoid(p0, starch_margin);

        scale_v = [
            rand(0.9,1.2,1,seed0+11000+i),
            rand(0.85,1.15,1,seed0+12000+i),
            rand(0.8,1.3,1,seed0+13000+i)
        ];
        color(col_starch)
        translate(p) scale(scale_v) sphere(r);
    }
}

module nucleoid_region() {
    color(col_nucleoid)
    ellipsoid(nucleoid_size[0], nucleoid_size[1], nucleoid_size[2]);
}

module ribosomes(n=ribosome_count, seed0=seed) {
    ia = inner_axes();
    color(col_ribo)
    for (i=[0:n-1]) {
        p0 = vmul(rand3(-1,1,seed0+15000+i), [ia[0]-0.2, ia[1]-0.2, ia[2]-0.2]);
        p  = clamp_inside_ellipsoid(p0, 0.2);
        translate(p) sphere(r=ribosome_r);
    }
}

// ----------------- 主組裝 -----------------
module chloroplast() {
    if (show_envelope) chloroplast_envelope();
    if (show_stroma) stroma_fill();
    if (show_grana) grana_field();
    if (show_lamellae) lamellae_network();
    if (show_starch) starch_granules();
    if (show_nucleoid) nucleoid_region();
    if (show_ribosomes) ribosomes();
}

rotate([0,-15,20]) chloroplast();
