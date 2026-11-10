import * as THREE from 'three';

/** Fixed-size soft vapor pool. No textures or per-frame geometry allocations.
 * Owns one draw call; use burst() at liftoff/landing and jet() during the roll.
 * All positions/directions are world-space. Call update(dt) once per frame.
 */
export class ThrusterVapor {
  readonly mesh: THREE.InstancedMesh;
  private readonly count=640;
  private cursor=0;
  private readonly dummy=new THREE.Object3D();
  private readonly alpha=new THREE.InstancedBufferAttribute(new Float32Array(this.count),1);
  private readonly particles=Array.from({length:this.count},()=>({
    position:new THREE.Vector3(),velocity:new THREE.Vector3(),age:10,life:1,size:.1,growth:1,opacity:.5,
  }));
  constructor(){
    const geometry=new THREE.PlaneGeometry(1,1);
    geometry.setAttribute('vaporAlpha',this.alpha);this.alpha.setUsage(THREE.DynamicDrawUsage);
    const material=new THREE.ShaderMaterial({
      transparent:true,depthWrite:false,depthTest:true,
      vertexShader:`attribute float vaporAlpha;
        varying vec2 vUv; varying float vAlpha;
        void main(){
          vUv=uv;vAlpha=vaporAlpha;
          vec4 center=modelViewMatrix*instanceMatrix*vec4(0.,0.,0.,1.);
          float size=length(instanceMatrix[0].xyz);
          center.xy+=position.xy*size;
          gl_Position=projectionMatrix*center;
        }`,
      fragmentShader:`varying vec2 vUv; varying float vAlpha;
        void main(){
          vec2 p=vUv*2.-1.; float r=dot(p,p);
          float a=pow(max(0.,1.-r),2.)*vAlpha;
          if(a<.003)discard;
          vec3 tint=mix(vec3(.73,.79,.85),vec3(1.),max(0.,1.-r));
          gl_FragColor=vec4(tint,a);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
    });
    this.mesh=new THREE.InstancedMesh(geometry,material,this.count);
    this.mesh.name='thruster_vapor';this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);this.mesh.frustumCulled=false;
    this.dummy.scale.setScalar(0);this.dummy.updateMatrix();
    for(let i=0;i<this.count;i++)this.mesh.setMatrixAt(i,this.dummy.matrix);
  }
  jet(origin:THREE.Vector3,direction:THREE.Vector3,strength=1){
    for(let i=0;i<8;i++){
      const p=this.particles[this.cursor++%this.count];
      p.position.copy(origin);p.velocity.copy(direction).multiplyScalar((3+Math.random()*2)*strength);
      p.velocity.x+=(Math.random()-.5)*.8;p.velocity.z+=(Math.random()-.5)*.8;
      p.age=0;p.life=.65+Math.random()*.55;p.size=.10+Math.random()*.08;p.growth=1.1;p.opacity=.7;
    }
  }
  burst(origin:THREE.Vector3,landing=false){
    for(let i=0;i<60;i++){
      const p=this.particles[this.cursor++%this.count],angle=Math.random()*Math.PI*2;
      p.position.copy(origin);p.position.y=Math.max(.09,origin.y);
      const speed=(landing?2.0:1.3)+Math.random()*1.8;
      p.velocity.set(Math.cos(angle)*speed,.25+Math.random()*.55,Math.sin(angle)*speed);
      p.age=0;p.life=1.2+Math.random()*.65;p.size=.14+Math.random()*.20;p.growth=landing?1.5:1.25;p.opacity=.55;
    }
  }
  update(dt:number){
    this.particles.forEach((p,i)=>{
      p.age+=dt;
      if(p.age>=p.life){this.dummy.scale.setScalar(0);this.alpha.setX(i,0);}
      else {
        p.position.addScaledVector(p.velocity,dt);
        if(p.position.y<.08){p.position.y=.08;p.velocity.y=.22;p.velocity.x+=Math.sign(p.position.x)*.15;}
        p.velocity.multiplyScalar(Math.exp(-.9*dt));p.velocity.y+=.12*dt;
        const t=p.age/p.life;
        this.dummy.position.copy(p.position);this.dummy.scale.setScalar(p.size+p.age*p.growth);
        this.alpha.setX(i,p.opacity*Math.pow(1-t,1.5));
      }
      this.dummy.updateMatrix();this.mesh.setMatrixAt(i,this.dummy.matrix);
    });
    this.alpha.needsUpdate=true;this.mesh.instanceMatrix.needsUpdate=true;
  }
  dispose(){this.mesh.geometry.dispose();(this.mesh.material as THREE.Material).dispose();}
}
