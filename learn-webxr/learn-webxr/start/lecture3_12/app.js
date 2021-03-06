import * as THREE from '../../libs/three/three.module.js';
import { GLTFLoader } from '../../libs/three/jsm/GLTFLoader.js';
import { DRACOLoader } from '../../libs/three/jsm/DRACOLoader.js';
import { RGBELoader } from '../../libs/three/jsm/RGBELoader.js';
import { ARButton } from '../../libs/ARButton.js';
import { LoadingBar } from '../../libs/LoadingBar.js';
import { Player } from '../../libs/Player.js';
import { ControllerGestures } from '../../libs/ControllerGestures.js';

class App{
	constructor(){
		const container = document.createElement( 'div' );
		document.body.appendChild( container );
        
        this.clock = new THREE.Clock();
        
        this.loadingBar = new LoadingBar();

		this.assetsPath = '../../assets/';
        
		this.camera = new THREE.PerspectiveCamera( 70, window.innerWidth / window.innerHeight, 0.01, 20 );
		this.camera.position.set( 0, 1.6, 3 );
        
		this.scene = new THREE.Scene();

		const ambient = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 2);
        ambient.position.set( 0.5, 1, 0.25 );
		this.scene.add(ambient);
        
        const light = new THREE.DirectionalLight();
        light.position.set( 0.2, 1, 1);
        this.scene.add(light);
			
		this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true } );
		this.renderer.setPixelRatio( window.devicePixelRatio );
		this.renderer.setSize( window.innerWidth, window.innerHeight );
		this.renderer.outputEncoding = THREE.sRGBEncoding;
		container.appendChild( this.renderer.domElement );
        this.setEnvironment();
        
        this.workingVec3 = new THREE.Vector3();
        this.origin = new THREE.Vector3();
        this.euler = new THREE.Euler();
        this.quaternion = new THREE.Quaternion();
        
        this.initScene();
        this.setupXR();
		
		window.addEventListener('resize', this.resize.bind(this));
        
	}
    
    setEnvironment(){
        const loader = new RGBELoader().setDataType( THREE.UnsignedByteType );
        const pmremGenerator = new THREE.PMREMGenerator( this.renderer );
        pmremGenerator.compileEquirectangularShader();
        
        const self = this;
        
        loader.load( '../../assets/hdr/venice_sunset_1k.hdr', ( texture ) => {
          const envMap = pmremGenerator.fromEquirectangular( texture ).texture;
          pmremGenerator.dispose();

          self.scene.environment = envMap;

        }, undefined, (err)=>{
            console.error( 'An error occurred setting the environment');
        } );
    }
	
    resize(){ 
        this.camera.aspect = window.innerWidth / window.innerHeight;
    	this.camera.updateProjectionMatrix();
    	this.renderer.setSize( window.innerWidth, window.innerHeight );  
    }
    
    loadKnight(){
	    const loader = new GLTFLoader().setPath(this.assetsPath);
        const dracoLoader = new DRACOLoader();
        dracoLoader.setDecoderPath( '../../libs/three/js/draco/' );        
        loader.setDRACOLoader( dracoLoader );

		const self = this;
		
		// Load a GLTF resource
		loader.load(
			// resource URL
			`train_LowPoly.glb`,
			// called when the resource is loaded
			function ( gltf ) {
				//const object = gltf.scene.children[0];
				self.knight = gltf.scene;
                self.scene.add(self.knight);
				/*const options = {
					object: object,
					speed: 0.5,
					assetsPath: self.assetsPath,
					loader: loader,
                    animations: gltf.animations,
					clip: gltf.animations[0],
					app: self,
					name: 'knight',
					npc: false
				};*/
				
				//self.knight = new Player(options);
                //self.knight.object.visible = false;
				self.knight.visible = false;
				//self.knight.action = 'Dance';
				const scale = 0.1;
				//self.knight.object.scale.set(scale, scale, scale); 
				self.knight.scale.set(scale, scale, scale); 

                self.loadingBar.visible = false;
                self.renderer.setAnimationLoop( self.render.bind(self) );//(timestamp, frame) => { self.render(timestamp, frame); } );
			},
			// called while loading is progressing
			function ( xhr ) {

				self.loadingBar.progress = (xhr.loaded / xhr.total);

			},
			// called when loading has errors
			function ( error ) {

				console.log( 'An error has happened' );

			}
		);
	}		
    
    initScene(){
        this.reticle = new THREE.Mesh(
            new THREE.RingBufferGeometry( 0.15, 0.2, 32 ).rotateX( - Math.PI / 2 ),
            new THREE.MeshBasicMaterial()
        );
        
        this.reticle.matrixAutoUpdate = false;
        this.reticle.visible = false;
        this.scene.add( this.reticle );
        
        this.loadKnight();
    }
    
    setupXR(){
        this.renderer.xr.enabled = true;
        
        const self = this;
        let controller, controller1;

        const btn = new ARButton( this.renderer, { sessionInit: { requiredFeatures: [ 'hit-test' ], optionalFeatures: [ 'dom-overlay' ], domOverlay: { root: document.body } } } );
        
        this.gestures = new ControllerGestures( this.renderer );

        this.gestures.addEventListener('tap', (ev)=>{
            //console.log('tap');
            //self.ui.updateElement('info', 'tap');

            if (self.knight===undefined) return;
            
            if (self.reticle.visible){
                if (!self.knight.visible){
                    //self.workingVec3.setFromMatrixPosition( self.reticle.matrix );
                    //self.knight.newPath(self.workingVec3);
                //}else{
                    self.knight.position.setFromMatrixPosition( self.reticle.matrix );
                    self.knight.visible = true;
                    self.reticle.visible = false;
                }
            }
		});

        this.gestures.addEventListener( 'pan', (ev)=>{
            //console.log( ev );
            if (ev.initialise !== undefined){
                self.startPosition = self.knight.position.clone();
            }else{
                const pos = self.startPosition.clone().add( ev.delta.multiplyScalar(3) );
                self.knight.position.copy( pos );
                //self.ui.updateElement('info', `pan x:${ev.delta.x.toFixed(3)}, y:${ev.delta.y.toFixed(3)}, x:${ev.delta.z.toFixed(3)}` );
            } 
        });

        this.gestures.addEventListener( 'pinch', (ev)=>{
            //console.log( ev );  
            if (ev.initialise !== undefined){
                self.startScale = self.knight.scale.clone();
            }else{
                const scale = self.startScale.clone().multiplyScalar(ev.scale);
                self.knight.scale.copy( scale );
                //self.ui.updateElement('info', `pinch delta:${ev.delta.toFixed(3)} scale:${ev.scale.toFixed(2)}` );
            }
        });

        this.gestures.addEventListener( 'rotate', (ev)=>{
            //      sconsole.log( ev ); 
            if (ev.initialise !== undefined){
                self.startQuaternion = self.knight.quaternion.clone();
            }else{
                self.knight.quaternion.copy( self.startQuaternion );
                self.knight.rotateY( ev.theta );
                //self.ui.updateElement('info', `rotate ${ev.theta.toFixed(3)}`  );
            }
        });

        this.hitTestSourceRequested = false;
        this.hitTestSource = null;
        
        function onSelect() {
            if (self.knight===undefined) return;
            
            if (self.reticle.visible){
                if (!self.knight.visible){
                    //self.workingVec3.setFromMatrixPosition( self.reticle.matrix );
                    //self.knight.newPath(self.workingVec3);
                //}else{
                    self.knight.position.setFromMatrixPosition( self.reticle.matrix );
                    self.knight.visible = true;
                    self.reticle.visible = false;
                }
            }
        }

        //this.controller = this.renderer.xr.getController( 0 );
        //this.controller.addEventListener( 'select', onSelect );
        
        //this.scene.add( this.controller );    
    }
    
    requestHitTestSource(){
        const self = this;
        
        const session = this.renderer.xr.getSession();

        session.requestReferenceSpace( 'viewer' ).then( function ( referenceSpace ) {
            
            session.requestHitTestSource( { space: referenceSpace } ).then( function ( source ) {

                self.hitTestSource = source;

            } );

        } );

        session.addEventListener( 'end', function () {

            self.hitTestSourceRequested = false;
            self.hitTestSource = null;
            self.referenceSpace = null;

        } );

        this.hitTestSourceRequested = true;

    }
    
    getHitTestResults( frame ){
        const hitTestResults = frame.getHitTestResults( this.hitTestSource );
        const self = this;
        if ( hitTestResults.length ) {
            
            const referenceSpace = this.renderer.xr.getReferenceSpace();
            const hit = hitTestResults[ 0 ];
            const pose = hit.getPose( referenceSpace );

            if(!self.knight.visible){
                this.reticle.visible = true;
                this.reticle.matrix.fromArray( pose.transform.matrix );
			};

        } else {

            this.reticle.visible = false;

        }

    }

    render( timestamp, frame ) {
        const dt = this.clock.getDelta();
        //if (this.knight) this.knight.update(dt);
        if ( this.renderer.xr.isPresenting ){
            this.gestures.update();
        }
        //if ( this.knight !== undefined ) this.knight.update(dt);
        
        const self = this;
        
        if ( frame ) {

            if ( this.hitTestSourceRequested === false ) this.requestHitTestSource( )

            if ( this.hitTestSource ) this.getHitTestResults( frame );

        }

        this.renderer.render( this.scene, this.camera );
        
        /*if (this.knight.calculatedPath && this.knight.calculatedPath.length>0){
            console.log( `path:${this.knight.calculatedPath[0].x.toFixed(2)}, ${this.knight.calculatedPath[0].y.toFixed(2)}, ${this.knight.calculatedPath[0].z.toFixed(2)} position: ${this.knight.object.position.x.toFixed(2)}, ${this.knight.object.position.y.toFixed(2)}, ${this.knight.object.position.z.toFixed(2)}`);
        }*/
    }
}

export { App };
