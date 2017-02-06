angular.module('app', []);

angular.module('app').controller('blogController', function ($scope, $timeout) {
  var blog = this;
  blog.title = "Painel Administrador";
  window.webgi.post.getPostsList();
  $timeout(function () {
    blog.posts = window.webgi.post.postsList;
    console.log('posts', blog.posts)
  }, 2000);
  blog.atualizar = function () {
    window.webgi.post.getPostsList();
    $timeout(function () {
      blog.posts = window.webgi.post.postsList;
      console.log('posts', blog.posts)
      blog.tab = 'blog';
    }, 2000);
  };
  blog.salvar = function () {
    var editor = window.webgi.adicionarEditor.getContents();
    var newPost = {
      title: blog.post.title,
      body: editor.ops,
      author: blog.post.author,
      image: blog.post.image,
    }
    window.webgi.post.save(newPost);
  };
  blog.editar = function () {
    var editor = window.webgi.editarEditor.getContents();
    var editPost = {
      title: blog.post.title,
      body: editor.ops,
      author: blog.post.author,
      image: blog.post.image,
    }
    window.webgi.post.updatePost(editPost, blog.post.id);
    blog.atualizar();
  };
  blog.excluir = function (id) {
    window.webgi.post.deletePost(id);
    blog.atualizar();
  };
  blog.carregarPostagem = function (id) {
    window.webgi.post.getPost(id);
    $timeout(function () {
      blog.post = window.webgi.post.postItem;
      window.webgi.editarEditor.setContents(blog.post.body);
      console.log('post', blog.post)
    }, 1000);
    blog.tab = 'edit';
  };
  blog.tab = 'blog';

  blog.selectTab = function (setTab) {
    blog.tab = setTab;
    console.log(blog.tab)
  };

  blog.isSelected = function (checkTab) {
    return blog.tab === checkTab;
  };

  blog.post = {};

  // blog.addPost = function () {
  //   blog.post.createdOn = Date.now();
  //   blog.post.comments = [];
  //   blog.post.likes = 0;
  //   blog.posts.unshift(this.post);
  //   blog.tab = 0;
  //   blog.post = {};
  // };

});

  // app.controller('CommentController', function () {
  //   this.comment = {};
  //   this.addComment = function (post) {
  //     this.comment.createdOn = Date.now();
  //     post.comments.push(this.comment);
  //     this.comment = {};
  //   };
  // });