window.qsv = function (s) {
	return document.querySelector(s) && document.querySelector(s).value;
}
window.qsa = function (s) {
	return document.querySelectorAll(s);
}
window.webgi = {
	internal: {},
	boot: function () {
		if (!webgi.internal.boot)
			webgi.internal.boot = new Promise(function (resolve, reject) {
				var config = {
					apiKey: "AIzaSyBegqEpv3FAt15OGYz6oprOlQ6OVUJ_dN4",
					authDomain: "blog-webgi.firebaseapp.com",
					databaseURL: "https://blog-webgi.firebaseio.com",
					storageBucket: "blog-webgi.appspot.com",
					messagingSenderId: "314153424044"
				};
				firebase.initializeApp(config);
				var unsubscribe = firebase.auth().onAuthStateChanged(function (user) {
					if (user) {
						resolve(user);
						unsubscribe();
					}
				});
				firebase.auth().signInAnonymously();
				setTimeout(function () {
					resolve();
					unsubscribe();
				}, 1000);
			});
		return webgi.internal.boot;
	},
	usuario: {
		register(email, password) {
			return webgi.boot().then(function () {
				let context = this;
				let promise = new Promise(function (resolve, reject) {
					firebase.auth().createUserWithEmailAndPassword(email, password)
						.then(function () {
							location.href = '/';
						})
						.catch(function (error) {
							// Handle Errors here.
							var errorCode = error.code;
							var errorMessage = error.message;
							if (errorCode == 'auth/weak-password') {
								alert('A senha está muito curta!');
							} else {
								alert(errorMessage);
							}
							console.log(error);
						});
				});
				return promise;
			});
		},
		cleanUser(user) {
			return {
				email: user.password.email,
				token: user.token,
				uid: user.uid
			}
		},
		loginFacebook: function () {
			return webgi.boot().then(function () {
				return firebase.auth()
					.signInWithPopup(new firebase.auth.FacebookAuthProvider())
			});
		},
		loginGoogle: function () {
			return webgi.boot().then(function () {
				return firebase.auth()
					.signInWithPopup(new firebase.auth.GoogleAuthProvider())
			});
		},
		login(email, password) {
			return webgi.boot().then(function () {
				let promise = new Promise(function (resolve, reject) {
					firebase.auth().signInWithEmailAndPassword(email, password)
						.then(function () {
							location.href = '/';
						})
						.catch(function (error) {
							// Handle Errors here.
							var errorCode = error.code;
							var errorMessage = error.message;
							if (errorCode === 'auth/wrong-password')
								console.log('Senha errada');
							else if (errorCode === '"auth/user-not-found"')
								console.log('Usuário não encontrado');
							console.log(error);
							reject(err);

						});
				});
				return promise;
			});
		},
		logout() {
			return webgi.boot().then(function () {
				return new Promise(function (relsove, reject) {
					firebase.auth().signOut();
					relsove();
				});
			});
		},
		updateProfile(profile = {}, uid) {
			let userProfile = firebase.child('users').child(uid);
			let promise = new Promise(function (resolve, reject) {
				userProfile.set(profile, function (err) {
					if (err) {
						reject(err);
					}
					else {
						resolve(profile);
					}
				});
			});
			return promise;
		},
		getProfile(uid) {
			let userProfile = firebase.child('users').child(uid);
			let promise = new Promise(function (resolve, reject) {
				userProfile.on("value", (snapshot) => {
					let profile = snapshot.val();
					resolve(profile);
				}, (error) => {
					reject(error);
				});
			});
			return promise;
		}
	},
	post: {
		save(newPost) {
			return window.webgi.post.createPost(newPost)
				.then(function () {
					location.href = '/';
				}).catch(function (err) {
					console.dir(err);
				});
		},
		createPost(newPost) {
			return webgi.boot().then(function () {
				let postFirebase = firebase.database().ref('/posts/');
				const post = Object.assign(newPost, {
					created_at: new Date().getTime()
				});
				let promise = new Promise((resolve, reject) => {
					try {
						let create = postFirebase.push();
						let key = create.key;
						create.set(post, function () {
							post.id = key;
							resolve(post);
						});
					}
					catch (e) {
						reject(e.message);
					}
				})
				return promise;
			});
		},
		updatePost(post, post_id) {
			return webgi.boot().then(function () {
				let postFirebase = firebase.database().ref('/posts/' + post_id);
				post.created_at = new Date().getTime();

				let promise = new Promise((resolve, reject) => {
					try {
						postFirebase.update(post, function () {
							post.id = post_id;
							resolve(post);
						});
					}
					catch (e) {
						reject(e.message);
					}
				});
				return promise;
			});
		},
		postsList: [],
		getPostsList() {
			return webgi.boot().then(function () {
				let postFirebase = firebase.database().ref('/posts/');
				let promise = new Promise((resolve, reject) => {
					try {
						postFirebase.on('value', function (snapshot) {
							var result = snapshot.val();
							let posts = window.webgi.mergeArrayObjectWithKey(snapshot.val());
							let loopGetUser = function (postIndex) {
								if (postIndex == posts.length) {
									resolve(posts.reverse())
								} else {
									// posts.forEach(function (post) {
									// 	post.content = post.content.replace(/<(?:.|\n)*?>/gm, '');
									// })
									window.webgi.post.postsList = posts;
									// window.webgi.posts.getProfile(posts[postIndex].uid).then((profile) => {
									// 	posts[postIndex].user = profile;
									// 	loopGetUser(postIndex + 1)
									// });
								}
							}
							loopGetUser(0);
						});
					}
					catch (err) {
						reject(err.message);
					}
				});
				return promise;
			});
		},
		postItem: {},
		getPost(id) {
			return webgi.boot().then(function () {
				let postFirebase = firebase.database().ref('/posts/' + id);
				let promise = new Promise((resolve, reject) => {
					try {
						postFirebase.on('value', function (snapshot) {
							let post = snapshot.val();
							if (post) {
								window.webgi.post.postItem = window.webgi.mergeObjectWithKey(post, id);
							}
							else {
								reject('Post\'s not exists');
							}
						});
					}
					catch (e) {
						reject(e.message);
					}
				});
				return promise;
			});
		},
		deletePost(id) {
			return webgi.boot().then(function () {
				let postFirebase = firebase.database().ref('/posts/' + id);
				return new Promise((resolve, reject) => {
					postFirebase.remove((err) => {
						if (err) {
							reject(err.message);
						}
						else {
							resolve('Post was deleted');
							window.webgi.post.postsList = window.webgi.post.postsList.filter((post) => {
								post.id = !id
							});
						}
					});
				});
			});
		}
	},
	mergeArrayObjectWithKey(objects) {
		let new_objects = [];
		for (let key in objects) {
			let object = Object.assign(objects[key], { id: key });
			new_objects.push(object);
		}
		return new_objects;
	},
	mergeObjectWithKey(object, key) {
		return Object.assign(object, { id: key });
	}
}