/* $Id$ */

ZPluginConverse = function () {};

var customerMail, currentrecord, entity, entityId, mUserdatas, mPostdatas, mCommentdatas, currentUserId, currentZUID, oldPostValue, oldCommentValue, oldPostDescValue, deleteId, deleteType, mPostdatas1;

// Initialize the converse app with relevant details

ZPluginConverse.init = function () {

    mPostdatas1 = []

    // Capture the entity details on page load to 
    ZOHO.embeddedApp.on("PageLoad", function (data) { 
        currentrecord = data;
        entity = data.Entity;
        entityId = data.EntityId;

        // Capture the current logged in user details to identify users while creating, updating of new/existing posts

        ZOHO.CRM.CONFIG.getCurrentUser().then(function (data) {
            currentUserId = data.users[0].id;
            currentZUID = data.users[0].zuid;
            currentUserName = data.users[0].full_name;
        });

        // fetch post with the current entity id using crm api and append the data to user interface.

        ZPluginConverse.getPosts(); 

        // Capture all the user details of the organization for @mentions feature

        ZOHO.CRM.API.getAllUsers({Type:"AllUsers"}) 
        .then(function(data){
            mUserdatas = data;
        })

        // When text is entered in the title text box, remove the red bar

        $('#title').keyup(function () {
            $('#title').removeClass('error');
        });

        // When text is entered in the comments text box, remove the red bar

        $('#feed_comments').keyup(function () {
            $('#feed_comments').removeClass('error');
        });

        //Trigger the add record api when a new post is added and append the data to user interface.

        $('.add_btn').live('click', function () {
            var title = $('#title').val();
            var description = $('#feed_posts').val();
            if (title.length > 0) {
                ZPluginConverse.addRecord(entity, 'Posts', title, description);
                $('#title').val('');
                $('#feed_posts').val('');
            } else {
                $('#title').addClass('error');
            }
        });

        //Fetch the data from the text inputs, trigger the add record api when a new post is added and append the data under the respective comment.

        $('.comment_post_btn').live('click', function () {
            var description = $('.add_comment').val();
            var postId = $('.add_comment').attr('data-post-id');
            if (description.length > 0) {
                $('.comments_header').empty();
                ZPluginConverse.addRecord(entity, 'Comments', undefined, description, postId);
                var count = $(".comment_list_container .comments_user").length;
                if (count == 0) {
                    count = "";
                } else {
                    count = count + 1;
                }
                var commentsHeader = '<span>' + (count) + '</span>&nbsp;<span>Comments</span>&nbsp;';
                $('.comments_header').append(commentsHeader);
            } else {
                $('.add_comment').addClass('error');
            }
        });

        //Fetch the data from the text inputs, trigger the add record api when a new comment is added and append the data under the respective comment.

        $('.reply_post_btn').live('click', function () {
            var description = $(this).parents('.comments_user').find('.reply_txt').val();
            var postId = $(this).parents('.comments_user').find('.reply_txt').attr('data-post-id');
            var commentId = $(this).parents('.comments_user').find('.reply_txt').attr('data-comment-id');
            if (description.length > 0) {
                ZPluginConverse.addRecord(entity, 'Replies', undefined, description, postId, commentId);
                $('.add_reply').hide();
                $('.replyed_user_details_main').show();
                $(this).parents('.comments_user').find('.comment_reply').css('border-bottom', '1px solid #f3f2f2');
            } else {
                $('.add_comment').addClass('error');
            }
        });

        // Show the main view on clicking the X at the top right corner

        $('.closeComments').live('click', function () {
            ZPluginConverse.closeModel();
        });

        // Show edit and delete icon for replies

        $('.replyed_user_details_main .replyed_user_div').live("mouseover", function () {
            $(this).find('.con_list_action_icon').css('opacity', '0.75');
        });

        // hide edit and delete icon for replies

        $('.replyed_user_details_main .replyed_user_div').live("mouseleave", function () {
            $(this).find('.con_list_action_icon').css('opacity', '0');
        });

        // Show edit and delete icon for comments

        $('.comments_user .maincommentdiv').live("mouseover", function () {
            $(this).find('.con_list_action_icon').css('opacity', '0.75');
        });

        // Hide edit and delete icon for comments

        $('.comments_user .maincommentdiv').live("mouseleave", function () {
            $(this).find('.con_list_action_icon').css('opacity', '0');
        });

        // Show edit and delete icon for parent view posts

        $('.select_lists .con_list').live("mouseover", function () {
            $(this).find('.con_list_action_icon').css('opacity', '0.75');
        });

        // Hide edit and delete icon for parent view posts

        $('.select_lists .con_list').live("mouseleave", function () {
            $(this).find('.con_list_action_icon').css('opacity', '0');
        });

        // Show edit and delete icon for splitted view posts

        $('.converse_container .converse_list').live("mouseover", function () {
            $(this).find('.action_icon').css('opacity', '0.75');
        });

        // Show edit and delete icon for splitted view posts

        $('.converse_container .converse_list').live("mouseleave", function () {
            $(this).find('.action_icon').css('opacity', '0');
        });


        // Display delete alert and resize main div for the respective post, comment.

        $('.trash_icon').live("click", function (event) {
            deleteType = "Post";
            deleteId = $(this).parents('.con_list').attr('id');
            if (deleteId == undefined) {
                deleteId = $(this).parents('.converse_list').attr('id');
                if ((deleteId != undefined) && (deleteId.includes("m_"))) {
                    deleteId = deleteId.split('m_')[1];
                }
            }
            if (deleteId == undefined) {
                deleteType = "Comment";
                deleteId = $(this).parents('.replyed_user_div').attr('id');
            }
            if (deleteId == undefined) {
                deleteType = "Comment";
                deleteId = $(this).parents('.comments_user').attr('id');
            }
            ZPluginConverse.showAlert();
            if ($('.converse_container .converse_list').length > 0) {
                ZOHO.CRM.UI.Resize({height: "500",width: "1000"}).then(function (data) {}); // resize widget area
            } else {
                ZOHO.CRM.UI.Resize({height: "100",width: "1000"}).then(function (data) {}); // resize widget area
                $('.container').css('height', '50px');
            }
            event.stopPropagation();
        });

        // Display edit popup and resize main div for the respective post, comment.

        $('.edit_icon').live("click", function () {
            var type = "Post";
            var id = $(this).parents('.con_list').attr('id');
            if (id == undefined) {
                id = $(this).parents('.converse_list').attr('id');
                if ((id != undefined) && (id.includes("m_"))) {
                    id = id.split('m_')[1];
                }
            }
            if (id == undefined) {
                type = "Comment";
                id = $(this).parents('.replyed_user_div').attr('id');
            }
            if (id == undefined) {
                type = "Comment";
                id = $(this).parents('.comments_user').attr('id');
            }
            if (type === "Post") {
                ZPluginConverse.displayEditPostPopup(id);
            } else if (type === "Comment") {
                var postId = $('#listOfPosts .zmLSlct').attr('id');
                ZPluginConverse.displayEditComment(id);
            }
            event.preventDefault();
        });

        // Display splitted view and append sub comments for a particular post on clicking the spitted view

        $('.select_lists .preview_div').live('click', function () {
            $('.comment_list_container').empty();
            $('.zmPT').hide();
            var ele = $(this);
            var id = ele.attr('id');
            var postId = ele.parents('.con_list').attr('data-post');
            $('.comments_header').empty();
            ZPluginConverse.getComments(postId, ele); // invoke and append comment data 
            $('.con_list').removeClass('zmLSlct');
            $('.converse_list').removeClass("zmLSlct");
            $('#' + postId).addClass('zmLSlct');
        });

        // Display splitted view and append sub comments for a particular post on clicking the main view

        $('.converse_container .converse_list').live('click', function () {
            var postId = (($(this).attr('id')).split('m_')[1]);
            $('.comment_list_container').empty();
            $('.zmPT').hide();
            var ele = $(this);
            $('.comments_header').empty();
            ZPluginConverse.getComments(postId, ele); // invoke and append comment data 
            $('.con_list').removeClass('zmLSlct');
            $('.converse_list').removeClass("zmLSlct");
            $('#' + postId).addClass('zmLSlct');
            $('.converse_container').hide();
            $('.feeds_containers').show();
        });

        // Toggling the reply view on clicking the reply button and removing comment option

        $('.comment_reply').live('click', function () {
            $(this).parents('.comments_user').find('.add_reply').toggle();
            $('.no_comments_div').toggle();
            $('.reply_txt').val('');
            if ($('#' + $(this).parents('.comments_user').attr('id') + ' .replyed_user_div').length != 0) {
                $(this).parents('.comments_user').find('.comment_reply').css('border-bottom', '1px solid #f3f2f2');
            } else {
                $(this).parents('.comments_user').find('.comment_reply').css('border-bottom', 'none');
            }
        });

        $('.feed_edit_posts').live('click', function (event) {
            event.preventDefault();
        });

        $('.feed_edit_desciption').live('click', function (event) {
            event.stopPropagation();
        });

        ZPluginConverse.closeModel(); // Show default view during initialize
    });

    ZOHO.embeddedApp.init(); // initialize the app

};

//

ZPluginConverse.getPosts = function () {
    $('#listOfPosts').empty();
    var reqData;
    if (entity === "Leads") {
        reqData = {
            Entity: "cxwidgettest__Posts",
            Type: "criteria",
            Query: "(cxwidgettest__Lead:equals:" + entityId + ")"
        };
    } else if (entity === "Contacts") {
        reqData = {
            Entity: "cxwidgettest__Posts",
            Type: "criteria",
            Query: "(cxwidgettest__Contact:equals:" + entityId + ")"
        };
    }
    ZOHO.CRM.API.searchRecord(reqData) // search records for the particular entity using crm api
        .then(function (data) {
            try {
                var localStorageLen = window.localStorage.length;
                mPostdatas = data.data;
                if ((mPostdatas != undefined) && (mPostdatas.length > 0)) {
                    ZPluginConverse.getPostDetails(mPostdatas); // fetch all posts and append data to user interface from localstorage
                    $('.no_records_div').hide();
                    $('.converse_container').show();
                    $('.container').css('height', '500px');
                    ZOHO.CRM.UI.Resize({height: "500",width: "1000"}).then(function (data) {});  // resize widget area
                    if (localStorageLen > 0) {
                        if (mPostdatas1.length === undefined) {
                            mPostdatas1 = [];
                        }
                        for (var i = 0; i < window.localStorage.length; i++) {
                            try {
                                var actualKey = window.localStorage.key(i); // fetch all the localstorage keys in the user's browser
                                var splitIdKey = (actualKey.split("_post_")[1]);
                                var splitZuidKey = (actualKey.split("_post_")[0]);

                                if ((!splitIdKey.includes("_expiresIn")) && splitIdKey && (splitZuidKey === currentZUID) && (($("#" + splitIdKey).length == 0) || ($("#m_" + splitIdKey).length == 0))) { // check for valid posts, current logged in user's data and check if the data is already present in user interface.
                                    var postData = getStorage(actualKey); // fetch data for key from localstorage
                                    if (postData != null) {
                                        if (mPostdatas1.length != undefined) {
                                            mPostdatas1[mPostdatas1.length] = JSON.parse(postData);
                                        } else {
                                            mPostdatas1[0] = JSON.parse(postData);
                                        }
                                    }
                                }
                            } catch (err) {
                                console.log(err); // print error
                            }
                        }
                        ZPluginConverse.getPostDetails(mPostdatas1, true); // fetch all posts and append it to user interface from cache
                    }
                } else {
                    if (localStorageLen > 0) {
                        if (mPostdatas1 == undefined && mPostdatas1.length === 0) {
                            mPostdatas1 = [];
                        }
                        for (var i = 0; i < window.localStorage.length; i++) {
                            try {
                                var actualKey = window.localStorage.key(i);
                                var splitIdKey = (actualKey.split("_post_")[1]);
                                var splitZuidKey = (actualKey.split("_post_")[0]);
                                if ((!splitIdKey.includes("_expiresIn")) && splitIdKey && (splitZuidKey === currentZUID) && (($("#" + splitIdKey).length == 0) || ($("#m_" + splitIdKey).length == 0))) {
                                    var postData = getStorage(actualKey);
                                    if (postData != null) {
                                        mPostdatas1[mPostdatas1.length] = JSON.parse(postData);
                                    }
                                }
                            } catch (err) {
                                console.log(err); // print error
                            }
                        }
                        $('.converse_container').show();
                        $('.container').css('height', '500px');
                        ZOHO.CRM.UI.Resize({height: "500",width: "1000"}).then(function (data) {}); // resize widget area
                        ZPluginConverse.getPostDetails(mPostdatas1, true);
                    } else {
                        $('.bg_container').hide();
                        $('#loading_div').hide();
                        $('.msexchange-wrapper').css('background-color', 'white');
                        $('.container').css('height', '50px');
                        $('.converse_container').hide();
                        $('.no_records_div').show();
                        $('.no_records_div').css('display', 'inline');
                        ZOHO.CRM.UI.Resize({height: "100",width: "1000"}).then(function (data) {}); // resize widget area
                    }

                }
            } catch (err) {
                console.log(err); // print error
                ZOHO.CRM.UI.Resize({height: "100",width: "1000"}).then(function (data) {}); // resize widget area
                $('.bg_container').hide();
                $('#loading_div').hide();
                $('.converse_container').hide();
                $('.msexchange-wrapper').css('background-color', 'white');
                $('.no_records_div').show();
                $('.no_records_div').css('display', 'inline');
            }
        });
}

// Fetch parent comments for a particular post

ZPluginConverse.getComments = function (postId, ele) {
    $('.SC_ptit_post_section').hide();
    $('#loading_comments_div').show();
    $('#feed_comments').attr('data-post-id', postId);
    var reqData = {
        Entity: "cxwidgettest__Comments",
        Type: "criteria",
        Query: "((cxwidgettest__Post:equals:" + postId + ")or(cxwidgettest__Parent_Comment_ID:equals:null))"
    };
    ZOHO.CRM.API.searchRecord(reqData) 
        .then(function (data) {
            mCommentdatas = data;
            ZPluginConverse.getCommentDetails(postId, mCommentdatas.data, ele); // append comment data to user interface
            $('.zmPT').show();
        });
}

// Fetch child comments for a parent comment

ZPluginConverse.getChildComments = function (parentCommentId, ele) {
    $('.SC_ptit_post_section').hide();
    $('#loading_comments_div').show();
    var reqData = {
        Entity: "cxwidgettest__Comments",
        Type: "criteria",
        Query: "(cxwidgettest__Parent_Comment_ID:equals:" + parentCommentId + ")"
    };
    ZOHO.CRM.API.searchRecord(reqData)
        .then(function (data) {
            mChildCommentdatas = data;
            ZPluginConverse.getChildCommentDetails(parentCommentId, mChildCommentdatas.data, ele); // append child comment data to user interface
            $('.zmPT').show();
        });
}

// Fetch and append all the posts data to the user interface

ZPluginConverse.getPostDetails = function (data, emptyDiv) {
    var listOfPosts = data;
    if (listOfPosts != null && listOfPosts != undefined && listOfPosts.length > 0) {
        if (!emptyDiv) {
            $('.comment_list_container').empty();
            $('.converse_container').empty();
        }

        $.each(listOfPosts, function (index, mData) {
            var disabled = "";

            if (mData.Created_By.id != currentUserId) {
                disabled = "disabled";
            }

            var postContent = mData.cxwidgettest__Content;

            if ((postContent === "null") || (postContent == undefined)) {
                postContent = "";
            }

            var createdDate = new Date(mData.Created_Time).toDateString().split(' ').join(',');
            var formattedCreatedDate = createdDate.substring(createdDate.indexOf(',') + 1, createdDate.length).replace(',', ' ').replace(',', ', ');

            var lisofPostUI = '<div class="con_list" id="' + ZSEC.Encoder.encodeForHTMLAttribute(mData.id) + '" data-post="' + ZSEC.Encoder.encodeForHTMLAttribute(mData.id) + '">' +
                '<div class="con_list_icon_div">' +
                '<div class="user_icon"><img src="https://contacts.zoho.com/file?t=user&ID=' + ZSEC.Encoder.encodeForHTML(mData.cxwidgettest__ZUID) + '&fs=thumb" class="profilep" /></div></div>' +
                '<div class="con_list_user_detailsp">' +
                '<div class="con_list_user_div">' +
                '<span class="user_name">' + mData.Created_By.name + '</span> - <span class="date_txt">' + ZSEC.Encoder.encodeForHTML(formattedCreatedDate) + '</span>' +
                '<div class="con_list_action_icon ' + disabled + '">' +
                '<div class="edit_icon"></div>' +
                '<div class="trash_icon"></div>' +
                '</div>' +
                '</div>' +
                '</div>' +
                '<div class="preview_div">' +
                '<p class="subject">' + ZSEC.Encoder.encodeForHTML(mData.Name) + '</p>' +
                '<div class="preview_content">' + ZSEC.Encoder.encodeForHTML(postContent) + '</div>' +
                '<div class="comment_div">' +
                '<div style="float:left"><span>Comments</span><span> (' + ZSEC.Encoder.encodeForHTML(mData.cxwidgettest__Comment_Count) + ')</span></div><div id="showUpdateBtn" style="float:right; display:none"><button class="btnCancel" onclick="javascript:ZPluginConverse.hideEditPostPopup();">Cancel</button><button style="padding: 7px 14px; margin-right: 4px; background-color: #42a2eb!important; border: solid 1px #42a2eb!important; border-radius: 2px; color: #fff; outline: none; cursor: pointer; font-weight: 600;" onclick="javascript:ZPluginConverse.editPost();">Update</button></div>' +
                '</div>' +
                '</div>' +
                '</div>';
            var lisofPostUI1 = '<div class="converse_list" id="m_' + ZSEC.Encoder.encodeForHTMLAttribute(mData.id) + '">' +
                '<div class="list_div">' +
                '<div class="icon_div1">' +
                '<div class="user_icon"><img src="https://contacts.zoho.com/file?t=user&ID=' + ZSEC.Encoder.encodeForHTML(mData.cxwidgettest__ZUID) + '&fs=thumb" class="profilep" /></div>' +
                '</div>' +
                '<div class="converse_details">' +
                '<div class="user_div">  ' +
                '<span class="user_name">' + mData.Created_By.name + '</span> - <span class="date_txt">' + ZSEC.Encoder.encodeForHTML(formattedCreatedDate) + '</span>' +
                '</div>' +
                '<div class="action_icon ' + disabled + '">' +
                '<div class="edit_icon"></div>' +
                '<div class="trash_icon"></div>' +
                '</div>' +
                '</div>' +
                '<div class="preview_div">' +
                '<p class="subject">' + ZSEC.Encoder.encodeForHTML(mData.Name) + '</p> ' +
                '<div class="preview_content">' +
                ZSEC.Encoder.encodeForHTML(postContent) +
                '</div>' +
                '<div class="comment_div">' +
                '<div style="float:left"><span>Comments</span><span> (' + ZSEC.Encoder.encodeForHTML(mData.cxwidgettest__Comment_Count) + ')</span></div><div id="showUpdateBtn" style="float:right; display:none"><button class="btnCancel"  onclick="javascript:ZPluginConverse.hideEditPostPopup();">Cancel</button><button style="padding: 7px 14px; margin-right: 4px; background-color: #42a2eb!important; border: solid 1px #42a2eb!important; border-radius: 2px; color: #fff; outline: none; cursor: pointer; font-weight: 600;" onclick="javascript:ZPluginConverse.editPost();">Update</button></div>' +
                '</div>' +
                '</div>' +
                '</div>' +
                '</div>';

            if (!emptyDiv) {
                $('.converse_container').append(lisofPostUI1);
                $('#listOfPosts').append(lisofPostUI);
            } else {
                $('.converse_container').prepend(lisofPostUI1);
                $('#listOfPosts').prepend(lisofPostUI);
            }

        });

        setTimeout(function () {
            $('.bg_container').show();
            $('.msexchange-wrapper').css('background-color', '#f5f5f5');
            $('.no_records_div').hide();
        }, 1000);

    } else {
        $('.bg_container').hide();
        $('.msexchange-wrapper').css('background-color', 'white');
        $('.no_records_div').show();
        $('.no_records_div').css('display', 'inline');
    }
};

// show posts main view

ZPluginConverse.closeModel = function () {
    $('.con_list .zmLSlct').removeClass('zmLSlct');
    $('.converse_list').removeClass("zmLSlct");
    $('.converse_container').show();
    $('.feeds_containers').hide();
    var postId = $('#listOfPosts .zmLSlct').attr('id');
    if (postId != undefined) {
        $("#" + postId).find('.preview_div').find('p').html(oldPostValue);
        $("#" + postId).find('.preview_content').html(oldPostDescValue);
        $('.con_list_action_icon').show();
        $(".select_lists .preview_div").prop("disabled", false);
    }
}

// Invoke add record of crm api for the respective entity

ZPluginConverse.addRecord = function (current_module, module, title, description, postId, commentId) {
    var api_name;
    var recordData;
    if (module === "Posts") {
        if (title.length > 110) {
            title = title.substring(0, 110) + "...";
        }
        api_name = "cxwidgettest__Posts";
        if (current_module === "Leads") {
            recordData = {
                "Name": title,
                "cxwidgettest__ZUID": currentZUID,
                "cxwidgettest__Content": description,
                "cxwidgettest__Lead": entityId,
                "cxwidgettest__Comment_Count": "0"
            }
        } else if (current_module === "Contacts") {
            recordData = {
                "Name": title,
                "cxwidgettest__ZUID": currentZUID,
                "cxwidgettest__Content": description,
                "cxwidgettest__Contact": entityId,
                "cxwidgettest__Comment_Count": "0"
            }
        }
    } else if (module === "Comments") {
        title = description;
        if (description.length > 110) {
            title = description.substring(0, 110) + "...";
        }
        api_name = "cxwidgettest__Comments";
        recordData = {
            "Name": title,
            "cxwidgettest__Comments": description,
            "cxwidgettest__ZUID": currentZUID,
            "cxwidgettest__Post": postId
        }
    } else if (module === "Replies") {
        title = description;
        if (description.length > 110) {
            title = description.substring(0, 110) + "...";
        }
        api_name = "cxwidgettest__Comments";
        if (commentId == undefined) {
            commentId = "";
        }
        recordData = {
            "Name": title,
            "cxwidgettest__Comments": description,
            "cxwidgettest__ZUID": currentZUID,
            "cxwidgettest__Post": postId,
            "cxwidgettest__Parent_Comment_ID": commentId
        }
    }
    ZOHO.CRM.API.insertRecord({ 
        Entity: api_name,
        APIData: recordData,
        Trigger: ["workflow", "approval", "blueprint"]
    }).then(function (data) { // insert to teh respective entity using crm api and also trigger the workflow, approval, blueprint

        recordData.Created_By = data.data[0].details.Created_By;
        recordData.Created_Time = data.data[0].details.Created_Time;
        recordData.id = data.data[0].details.id;

        setStorage(currentZUID + "_post_" + data.data[0].details.id, JSON.stringify(recordData), 200); // push data to localStorage

        ZPluginConverse.showAddResponse(data.data[0], module, postId, commentId); // append data to user interface

        $('.container').css('height', '500px');
        if (module === "Posts") {
            $('#feed_posts').val('');
            $('#title').val('');
            $('.con_list').css('background-color', 'white');
            ZPluginConverse.closeModel();
        } else if (module === "Comments") {
            $('#feed_comments').val('');
            ZPluginConverse.updateCommentCount(postId, true); // update coment count to the respective post entity
        } else if (module === "Replies") {
            $('.reply_txt').val('');
        }
    });
}

// update coment count to the respective comment entity

ZPluginConverse.updateCommentCount = function (id, action) {
    var api_name = "cxwidgettest__Posts";
    var currentCommentCount = "0";
    ZOHO.CRM.API.getRecord({
            Entity: api_name,
            RecordID: id
        })
        .then(function (data) {
            if ((data.data) && (data.data.length > 0)) {
                var mData = data.data[0];
                if (action) {
                    currentCommentCount = parseInt(mData.cxwidgettest__Comment_Count) + 1;
                } else {
                    if (parseInt(mData.cxwidgettest__Comment_Count) > 0) {
                        currentCommentCount = parseInt(mData.cxwidgettest__Comment_Count) - 1;
                    }
                }
                var recordData = {
                    "cxwidgettest__Comment_Count": "" + currentCommentCount,
                    "id": id
                }
                ZOHO.CRM.API.updateRecord({
                    Entity: api_name,
                    APIData: recordData
                }).then(function (data) {});
            }
        })
}

// update post and revamp the UI.

ZPluginConverse.updateRecord = function (module, title, description, id) {
    var api_name;
    var recordData;
    if (module === "Posts") {
        api_name = "cxwidgettest__Posts";
        if (title.length > 110) {
            title = title.substring(0, 50) + "...";
        }

        recordData = {
            "Name": title,
            "cxwidgettest__ZUID": currentZUID,
            "cxwidgettest__Content": description,
            "id": id
        }
    } else if (module === "Comments") {
        api_name = "cxwidgettest__Comments";
        title = description;

        if (description.length > 110) {
            title = description.substring(0, 110) + "...";
        }

        recordData = {
            "Name": title,
            "cxwidgettest__ZUID": currentZUID,
            "cxwidgettest__Comments": description,
            "id": id
        }
    }
    ZOHO.CRM.API.updateRecord({
        Entity: api_name,
        APIData: recordData
    }).then(function (data) {
        if (module === "Posts") {
            $("#" + id).find('.preview_div').find('p').html(title);
            $("#" + id).find('.preview_content').html(description);
            $("#" + id).find('.preview_div').find('#showUpdateBtn').hide();
        } else if (module === "Comments") {
            $("#" + id).find('.comment_content').html(description);
        }
    });
}

// Fetch entity details and append data to the user interface.

ZPluginConverse.showAddResponse = function (data1, module, postId, commentId) {
    var id = data1.details.id;
    var api_name;
    if (data1.status == "success" || data1.status) {
        ZPluginConverse.hidepopup();
        if (module === "Posts") {
            api_name = "cxwidgettest__Posts";
        } else if (module === "Comments") {
            api_name = "cxwidgettest__Comments";
        } else if (module === "Replies") {
            api_name = "cxwidgettest__Comments";
        }
        ZOHO.CRM.API.getRecord({
                Entity: api_name,
                RecordID: id
            })
            .then(function (data) {
                var mData = data.data[0];
                if (module === "Posts") {

                    try {
                        mPostdatas.data.unshift(mData);
                    } catch (err) {
                        mPostdatas.data = [];
                        mPostdatas.data[0] = mData;
                    }

                    var postContent = mData.cxwidgettest__Content;

                    if ((postContent === "null") || (postContent == undefined)) {
                        postContent = "";
                    }

                    var createdDate = new Date(mData.Created_Time).toDateString().split(' ').join(',');
                    var formattedCreatedDate = createdDate.substring(createdDate.indexOf(',') + 1, createdDate.length).replace(',', ' ').replace(',', ', ');

                    var disabled = "";
                    if (mData.Created_By.id != currentUserId) {
                        disabled = "disabled";
                    }

                    $(".con_list").removeClass("zmLSlct");
                    $(".converse_list").removeClass("zmLSlct");

                    var lisofPostUI = '<div class="con_list" id="' + ZSEC.Encoder.encodeForHTMLAttribute(mData.id) + '" data-post="' + ZSEC.Encoder.encodeForHTMLAttribute(mData.id) + '">' +
                        '<div class="con_list_icon_div">' +
                        '<div class="user_icon"><img src="https://contacts.zoho.com/file?t=user&ID=' + ZSEC.Encoder.encodeForHTML(mData.cxwidgettest__ZUID) + '&fs=thumb" class="profilep" /></div></div>' +
                        '<div class="con_list_user_detailsp">' +
                        '<div class="con_list_user_div">' +
                        '<span class="user_name">' + mData.Created_By.name + '</span> - <span class="date_txt">' + ZSEC.Encoder.encodeForHTML(formattedCreatedDate) + '</span>' +
                        '<div class="con_list_action_icon ' + disabled + '">' +
                        '<div class="edit_icon"></div>' +
                        '<div class="trash_icon"></div>' +
                        '</div>' +
                        '</div>' +
                        '</div>' +
                        '<div class="preview_div">' +
                        '<p class="subject">' + ZSEC.Encoder.encodeForHTML(mData.Name) + '</p>' +
                        '<div class="preview_content">' + ZSEC.Encoder.encodeForHTML(postContent) + '</div>' +
                        '<div class="comment_div">' +
                        '<div style="float:left"><span>Comments</span><span> (' + ZSEC.Encoder.encodeForHTML(mData.cxwidgettest__Comment_Count) + ')</span></div><div id="showUpdateBtn" style="float:right; display:none"><button class="btnCancel" onclick="javascript:ZPluginConverse.hideEditPostPopup();">Cancel</button><button style="padding: 4px 14px 7px; margin-right: 4px; background-color: #42a2eb!important; border: solid 1px #42a2eb!important; border-radius: 2px; color: #fff; outline: none; cursor: pointer; " onclick="javascript:ZPluginConverse.editPost();">Update</button></div>' +
                        '</div>' +
                        '</div>' +
                        '</div>';
                    var lisofPostUI1 = '<div class="converse_list" id="m_' + ZSEC.Encoder.encodeForHTMLAttribute(mData.id) + '">' +
                        '<div class="list_div">' +
                        '<div class="icon_div1">' +
                        '<div class="user_icon"><img src="https://contacts.zoho.com/file?t=user&ID=' + ZSEC.Encoder.encodeForHTML(mData.cxwidgettest__ZUID) + '&fs=thumb" class="profilep" /></div>' +
                        '</div>' +
                        '<div class="converse_details">' +
                        '<div class="user_div">  ' +
                        '<span class="user_name">' + mData.Created_By.name + '</span> - <span class="date_txt">' + ZSEC.Encoder.encodeForHTML(formattedCreatedDate) + '</span>' +
                        '</div>' +
                        '<div class="action_icon ' + disabled + '">' +
                        '<div class="edit_icon"></div>' +
                        '<div class="trash_icon"></div>' +
                        '</div>' +
                        '</div>' +
                        '<div class="preview_div">' +
                        '<p class="subject">' + ZSEC.Encoder.encodeForHTML(mData.Name) + '</p> ' +
                        '<div class="preview_content">' +
                        ZSEC.Encoder.encodeForHTML(postContent) +
                        '</div>' +
                        '<div class="comment_div">' +
                        '<div style="float:left"><span>Comments</span><span> (' + ZSEC.Encoder.encodeForHTML(mData.cxwidgettest__Comment_Count) + ')</span></div><div id="showUpdateBtn" style="float:right; display:none"><button class="btnCancel" onclick="javascript:ZPluginConverse.hideEditPostPopup();">Cancel</button><button style="padding: 4px 14px 7px; margin-right: 4px; background-color: #42a2eb!important; border: solid 1px #42a2eb!important; border-radius: 2px; color: #fff; outline: none; cursor: pointer; " onclick="javascript:ZPluginConverse.editPost();">Update</button></div>' +
                        '</div>' +
                        '</div>' +
                        '</div>' +
                        '</div>';
                    $('.converse_container').prepend(lisofPostUI1);
                    $('#listOfPosts').prepend(lisofPostUI);
                } else if (module === "Comments") {
                    try {
                        mCommentdatas.data.unshift(mData);
                    } catch (err) {
                        mCommentdatas.data = [];
                        mCommentdatas.data[0] = mData;
                    }
                    var createdDate = new Date(mData.Modified_Time).toDateString().split(' ').join(',');
                    var formattedCreatedDate = createdDate.substring(createdDate.indexOf(',') + 1, createdDate.length).replace(',', ' ').replace(',', ', ');

                    var disabled = "";
                    if (mData.Created_By.id != currentUserId) {
                        disabled = "disabled";
                    }
                    comment = '<div class="comments_user"  id="' + mData.id + '">' +
                        '<div class="maincommentdiv" style="padding:10px"><div class="user_info">' +
                        '<div class="con_list_icon_div">' +
                        '<div class="user_icon"><img src="https://contacts.zoho.com/file?t=user&ID=' + ZSEC.Encoder.encodeForHTML(mData.cxwidgettest__ZUID) + '&fs=thumb" class="profilep"/></div>' +
                        '</div>' +
                        '<div class="con_list_action_icon ' + disabled + '" style="margin-right: 21px;">' +
                        '<div class="edit_icon"></div>' +
                        '<div class="trash_icon"></div>' +
                        '</div>' +
                        '<div class="con_list_user_details">' +
                        '<div class="con_list_user_div">' +
                        '<div style="margin-bottom:8px;"><span class="user_name" style="color:black;">' + mData.Created_By.name + '</span> <span class="date_txt">' + ZSEC.Encoder.encodeForHTML(formattedCreatedDate) + '</span><div class="comment_content">' +
                        ZSEC.Encoder.encodeForHTML(mData.cxwidgettest__Comments) +
                        '</div></div>' +
                        '</div>' +
                        '</div>' +
                        '</div></div>' +
                        '<div class="comment_reply"> ' +
                        '<span>Reply</span> ' +
                        '</div>' +
                        '<div class="add_reply"> ' +
                        '<div class="addreply_icon_div">' +
                        '<div class="addreply_user_icon"><img src="https://contacts.zoho.com/file?t=user&ID=' + ZSEC.Encoder.encodeForHTML(currentZUID) + '&fs=thumb" class="profilec"/></div>' +
                        '</div>' +
                        '<div class="reply_txt_div"> ' +
                        '<input class="reply_txt" data-comment-id="' + mData.id + '" data-post-id="' + postId + '" type="text" name="" placeholder="Write reply"><button class="reply_post_btn">Reply</button><button class="btnCancel1" onclick="javascript:$(\'.add_reply\').hide();$(\'.no_comments_div\').show();$(\'.reply_txt\').val(\'\');">Cancel</button>' +
                        '</div>' +
                        '</div>' +
                        '<div class="replyed_user_details_main" id="sub_' + mData.id + '"></div>' +
                        '</div>';
                    $('.comment_list_container').append(comment);
                    $('#' + postId).find('.commentsCount').empty();
                    $('#' + postId).find('.commentsCount').html('Comments (<span class=\"commentsCountTxt\">' + $('.comment_list_container').find('.request_order').length + '</span>)');
                    $('.no_comments_div').remove();
                    var commentsBody = '<div class="no_comments_div">' +
                        '<div class="add_comment_textarea">' +
                        '<textarea class="add_comment" type="text" data-post-id="' + postId + '" placeholder="Add a comment"></textarea>' +
                        '</div>' +
                        '<div>' +
                        '<button class="comment_post_btn">Comment</button>' +
                        '</div>' +
                        '</div>';
                    $('.comment_list_container').append(commentsBody);

                } else if (module === "Replies") {
                    try {
                        mCommentdatas.data.unshift(mData);
                    } catch (err) {
                        mCommentdatas.data = [];
                        mCommentdatas.data[0] = mData;
                    }
                    var createdDate = new Date(mData.Modified_Time).toDateString().split(' ').join(',');
                    var formattedCreatedDate = createdDate.substring(createdDate.indexOf(',') + 1, createdDate.length).replace(',', ' ').replace(',', ', ');

                    var disabled = "";
                    if (mData.Created_By.id != currentUserId) {
                        disabled = "disabled";
                    }
                    comment = '<div class="replyed_user_div" id="' + mData.id + '">' +
                        '<div class="replyed_user_icon_div">' +
                        '<div class="replyed_user_icon"><img src="https://contacts.zoho.com/file?t=user&ID=' + ZSEC.Encoder.encodeForHTML(currentZUID) + '&fs=thumb" class="profilec"></div>' +
                        '</div>' +
                        '<div class="replyed_user_info">' +
                        '<span class="user_name" style="color:black;">' + mData.Created_By.name + '</span> ' +
                        '<div class="con_list_action_icon ' + disabled + '">' +
                        '<div class="edit_icon"></div>' +
                        '<div class="trash_icon"></div>' +
                        '</div>' +
                        ' <span class="date_txt">' + ZSEC.Encoder.encodeForHTML(formattedCreatedDate) + '</span>' +
                        '<div class="comment_content">' + ZSEC.Encoder.encodeForHTML(mData.cxwidgettest__Comments) + '</div></div></div>';
                    $('#sub_' + commentId).append(comment);
                    $('#' + postId).find('.commentsCount').empty();
                    $('#' + postId).find('.commentsCount').html('Comments (<span class=\"commentsCountTxt\">' + $('.comment_list_container').find('.request_order').length + '</span>)');

                }
                if (module === "Posts") {
                    $('.bg_container').show();
                    $('.msexchange-wrapper').css('background-color', '#f5f5f5');
                    $('.no_records_div').hide();
                    ZPluginConverse.closeModel();
                    $("#listOfPosts").scrollTop('0px');
                    $('.zmPT').hide();
                } else if (module === "Comments") {
                    $(".comment_list_container").scrollTop('10000000');
                }
            });
    }
};

// Fetch respective comment details and append data to the user interface.

ZPluginConverse.getCommentDetails = function (postId, data, ele) {
    var json = data;
    var comment;
    $('.comment_list_container').empty();
    $('.comment_list_container').hide();
    $('.bor_bottom_span_count').remove();
    if (json != undefined) {

        for (var i = 0; i < json.length; i++) {
            var mData = json[i];

            if (typeof (mData.cxwidgettest__Parent_Comment_ID) != "string") {
                ZPluginConverse.getChildComments(mData.id, ele);
            }

            var createdDate = new Date(mData.Modified_Time).toDateString().split(' ').join(',');
            var formattedCreatedDate = createdDate.substring(createdDate.indexOf(',') + 1, createdDate.length).replace(',', ' ').replace(',', ', ');
            var disabled = "";
            if (mData.Created_By.id != currentUserId) {
                disabled = "disabled";
            }
            var style = "",
                commentsHeader1 = "";
            var isParent = mData.cxwidgettest__Parent_Comment_ID;

            if (i <= 0) {
                commentsHeader1 = '';
            }
            comment = '<div class="comments_user"  id="' + mData.id + '" ' + style + '><div class="comments_header" style="padding-top: 10px;"></div>' +
                '<div class="maincommentdiv" style="padding:10px"><div class="user_info">' +
                '<div class="con_list_icon_div">' +
                '<div class="user_icon"><img src="https://contacts.zoho.com/file?t=user&ID=' + ZSEC.Encoder.encodeForHTML(mData.cxwidgettest__ZUID) + '&fs=thumb" class="profilep"/></div>' +
                '</div>' +
                '<div class="con_list_action_icon ' + disabled + '">' +
                '<div class="edit_icon"></div>' +
                '<div class="trash_icon"></div>' +
                '</div>' +
                '<div class="con_list_user_details">' +
                '<div class="con_list_user_div">' +
                '<div  style="margin-bottom:8px;"><span class="user_name" style="color:black;">' + mData.Created_By.name + '</span> <span class="date_txt">' + ZSEC.Encoder.encodeForHTML(formattedCreatedDate) + '</span><div class="comment_content">' +
                ZSEC.Encoder.encodeForHTML(mData.cxwidgettest__Comments) +
                '</div></div>' +
                '</div>' +
                '</div>' +
                '</div></div>' +
                '<div class="comment_reply"> ' +
                '<span>Reply</span> ' +
                '</div>' +
                '<div class="add_reply"> ' +
                '<div class="addreply_icon_div">' +
                '<div class="addreply_user_icon"><img src="https://contacts.zoho.com/file?t=user&ID=' + ZSEC.Encoder.encodeForHTML(currentZUID) + '&fs=thumb" class="profilec"/></div>' +
                '</div>' +
                '<div class="reply_txt_div"> ' +
                '<input class="reply_txt" data-comment-id="' + mData.id + '" data-post-id="' + postId + '" type="text" name="" placeholder="Write reply"><button class="reply_post_btn">Reply</button><button class="btnCancel1" onclick="javascript:$(\'.add_reply\').hide();$(\'.no_comments_div\').show();$(\'.reply_txt\').val(\'\');">Cancel</button>' +
                '</div>' +
                '</div>' +
                '<div class="replyed_user_details_main" id="sub_' + mData.id + '"></div>' +
                '</div>';

            if (typeof (isParent) == "object") {
                $('.comment_list_container').append(comment);
            }
        }
        $('.comment_list_container').show();
    } else {
        $('.comment_list_container').show();
    }
    var comheader = '<div class="comments_header" style="padding-top: 10px;"></div>';
    var count = $(".comment_list_container .comments_user").length;
    if (count == 0) {
        count = "";
        $('.comments_header').show();
    } else {
        comheader = "";
        $('.comments_header').slice(1).hide();
    }
    $('.comments_header').slice(1).empty();
    var commentsHeader = '<div><div style="padding: 8px; border-bottom: 1px solid #f3f2f2; float: right; width: 100%; box-sizing: border-box;"><span class="closeComments" onclick="ZPluginConverse.closeModel();"><img class="nav_icon" src="../app/images/close.svg"></span></div>' + comheader + '</div>';
    $('.comment_list_container').prepend(commentsHeader);


    var commentsHeader = '<span>' + (count) + '</span> <span>Comments</span> ';
    $('.comments_header').append(commentsHeader);
    var commentsBody = '<div class="no_comments_div">' +
        '<div class="add_comment_textarea">' +
        '<textarea class="add_comment" type="text" data-post-id="' + postId + '" placeholder="Add a comment"></textarea>' +
        '</div>' +
        '<div>' +
        '<button class="comment_post_btn">Comment</button>' +
        '</div>' +
        '</div>';
    $('.comment_list_container').append(commentsBody);
};

// Fetch respective comment details and append data to the respective comment.

ZPluginConverse.getChildCommentDetails = function (parentCommentId, data, ele) {
    var json = data;
    var comment;
    $('.bor_bottom_span_count').remove();
    if (json != undefined) {
        for (var i = 0; i < json.length; i++) {
            var mData = json[i];
            var createdDate = new Date(mData.Modified_Time).toDateString().split(' ').join(',');
            var formattedCreatedDate = createdDate.substring(createdDate.indexOf(',') + 1, createdDate.length).replace(',', ' ').replace(',', ', ');
            var disabled = "";
            if (mData.Created_By.id != currentUserId) {
                disabled = "disabled";
            }
            comment = '<div class="replyed_user_div" id="' + mData.id + '">' +
                '<div class="replyed_user_icon_div">' +
                '<div class="replyed_user_icon"><img src="https://contacts.zoho.com/file?t=user&ID=' + ZSEC.Encoder.encodeForHTML(mData.cxwidgettest__ZUID) + '&fs=thumb" class="profilec"/></div>' +
                '</div>' +
                '<div class="replyed_user_info">' +
                '<span class="user_name" style="color:black;">' + mData.Created_By.name + '</span>' +
                '<div class="con_list_action_icon ' + disabled + '">' +
                '<div class="edit_icon"></div>' +
                '<div class="trash_icon"></div>' +
                '</div>' +
                ' <span class="date_txt">' + ZSEC.Encoder.encodeForHTML(formattedCreatedDate) + '</span>' +
                '<div class="comment_content">' +
                ZSEC.Encoder.encodeForHTML(mData.cxwidgettest__Comments) +
                '</div>  ' +
                '</div>' +
                '</div>';
            $('#sub_' + parentCommentId).append(comment);
        }
        $("#listOfPosts").scrollTop('');
    } else {
        $('#' + parentCommentId).find('.comment_reply').css('border', '0px');
    }
    if ($('#sub_' + parentCommentId + ' .replyed_user_div').length > 0) {
        $('#' + parentCommentId).find('.replyed_user_details_main').show();
    }
};

// Method for deleting a post along with its sub comments

ZPluginConverse.deletePost = function (delpostId) {
    // delete the record using CRM API
    ZOHO.CRM.API.deleteRecord({ 
            Entity: "cxwidgettest__Posts",
            RecordID: delpostId
        })
        .then(function (data) { 
            if (data.data[0].status == "success") {
                $("#m_" + delpostId).remove();
                $("#" + delpostId).remove();
                removeStorage(currentZUID + "_post_" + delpostId); // updating localStorage
                ZPluginConverse.closeModel(); 
                ZPluginConverse.invokeDeleteForComments('' + delpostId); // delete all the sub comments of post
            for (var i = 0; i < mPostdatas.data.length; i++) {
                if(mPostdatas.data[i]&&mPostdatas.data[i].Created_By){
                    var postData = mPostdatas.data[i];
                    var postCreatedId = postData.Created_By.id;
                    var postid = postData.id;
                    if ((delpostId + '' === postid) && (postCreatedId === currentUserId)) {
                        delete mPostdatas[i];
                        break;
                    }
                }
            }
                if ($("#listOfPosts").find('.con_list').length == 0) {
                    $('.bg_container').hide();
                    $('.msexchange-wrapper').css('background-color', 'white');
                    $('.no_records_div').css('display', 'inline-grid');
                }
            }
        });
}

// Method for deleting a parent comment of a post along with its sub comments and updating the comment count in post

ZPluginConverse.deleteComment = function (delCommentId, updpostId, isPostDeleted) {
    ZPluginConverse.invokeDeleteForChildComments(delCommentId, updpostId, isPostDeleted);

    // delete the record using CRM API

    ZOHO.CRM.API.deleteRecord({
            Entity: "cxwidgettest__Comments",
            RecordID: delCommentId
        })
        .then(function (data) {
            if (data.data[0].status == "success") {
                if (isPostDeleted) {
                    ZPluginConverse.updateCommentCount(updpostId, false);
                }
            for (var i = 0; i < mCommentdatas.data.length; i++) {
                if(mCommentdatas.data[i]&&mCommentdatas.data[i].Created_By){
                    var commentData = mCommentdatas.data[i];
                    var commentCreatedId = commentData.Created_By.id;
                    var commentid = commentData.id;
                    if ((delCommentId + '' === commentid) && (commentCreatedId === currentUserId)) {
                $("#" + delCommentId).remove();
                $('.comment_list_container').find('.comments_header').empty();
                $('.comment_list_container').find('.comments_header').html('<span>' + ($('.comment_list_container').find('.comments_header').length) + '</span>&nbsp;<span>Comments</span>&nbsp;');
                $('.comment_list_container').find('.comments_header').show();
                        delete mCommentdatas.data[i];
                        break;
                    }
                }
            }
            }
        });
}

// Method for deleting the all the comments of a particular post

ZPluginConverse.invokeDeleteForComments = function (postId) { 

    var reqData = {
        Entity: "cxwidgettest__Comments",
        Type: "criteria",
        Query: "(cxwidgettest__Post:equals:" + postId + ")"
    };

    // search the comments for a particular post using CRM API

    ZOHO.CRM.API.searchRecord(reqData)
        .then(function (data) {
            if ((data != undefined) && (data.data != undefined)) {
                for (var i = 0; i < data.data.length; i++) {
                    var id = data.data[i].id;
                    ZPluginConverse.deleteComment(id, postId, false);
                }
            }
        });
}

// Method for deleting the child comments of a comment

ZPluginConverse.invokeDeleteForChildComments = function (parentCommentId, postId) { 
    var reqData = {
        Entity: "cxwidgettest__Comments",
        Type: "criteria",
        Query: "(cxwidgettest__Parent_Comment_ID:equals:" + parentCommentId + ")"
    };

    // search for the child comments using parent comment id using CRM API

    ZOHO.CRM.API.searchRecord(reqData)
        .then(function (data) {
            if ((data != undefined) && (data.data != undefined)) {
                for (var i = 0; i < data.data.length; i++) {
                    var id = data.data[i].id;
                    ZPluginConverse.deleteComment(id, postId, false); // invoke delete for child comment using CRM API
                }
            }
        });
}

// Method for editing a post

ZPluginConverse.editPost = function () {
    var newPost = $('#feed_edit_posts').val();
    var newPostDesc = $('#feed_edit_desciption').val();
    var editPostId = $('#feed_edit_posts').attr('data-post-id');
    if (newPost.length > 0) {
        for (var i = 0; i < mPostdatas.data.length; i++) {
            if (mPostdatas.data[i] && mPostdatas.data[i].Created_By) {
                var postData = mPostdatas.data[i];
                var postCreatedId = postData.Created_By.id;
                var postid = postData.id;
                if ((editPostId + '' === postid) && (postCreatedId === currentUserId)) {
                    ZPluginConverse.updateRecord("Posts", newPost, newPostDesc, editPostId); // invoke update record for respective post using CRM API who has privilege
                    break;
                }
            }
        }
    } else {
        $('#feed_edit_posts').addClass('error');
    }
    $(".select_lists .preview_div").prop("disabled", false);
    $('.con_list_action_icon').show();
}

// Method for editing a comment

ZPluginConverse.editComment = function () {
    var newCommentd = $('#feed_edit_comments').val();
    var editCommentId = $('#feed_edit_comments').attr('data-comment-id');
    if (newCommentd.length > 0) {
        for (var i = 0; i < mCommentdatas.data.length; i++) {
            if (mCommentdatas.data[i] && mCommentdatas.data[i].Created_By) {
                var commentData = mCommentdatas.data[i];
                var commentCreatedId = commentData.Created_By.id;
                var commentid = commentData.id;
                if ((editCommentId + '' === commentid) && (commentCreatedId === currentUserId)) {
                    ZPluginConverse.updateRecord("Comments", undefined, newCommentd, editCommentId); // invoke update record for the respective comment using CRM API who has privilege
                    $('.con_list_action_icon').show();
                    break;
                }
            }
        }
    } else {
        $('#feed_edit_comments').addClass('error');
    }
}

// Show new post overlay

ZPluginConverse.displaypopup = function () {
    ZOHO.CRM.UI.Resize({height: "500",width: "1000"}).then(function (data) {}); // resize widget area
    $(".windowFirger").addClass('open-firger');
    $(".popup_widget").show();
}

// Show custom alert pop up

ZPluginConverse.showAlert = function () {
    $(".windowFirger").addClass('open-firger');
    $(".alert_notification").show();
}

// Hide custom alert pop up

ZPluginConverse.hideAlert = function () {
    $(".windowFirger").removeClass('open-firger');
    $(".alert_notification").hide();
}

// Process delete after alert confirmation

ZPluginConverse.processDelete = function () {
    if (deleteType === "Post") {
        ZPluginConverse.deletePost(deleteId);
    } else if (deleteType === "Comment") {
        var postId = $('#listOfPosts .zmLSlct').attr('id');
        ZPluginConverse.deleteComment(deleteId, postId, true);
    }
}

// Hide new post overlay

ZPluginConverse.hidepopup = function () {
    $('#title').val('');
    $('#feed_posts').val('');
    $(".popup_widget").hide();
    $(".windowFirger").removeClass('open-firger');
}

// Show edit UI layout for respective post

ZPluginConverse.displayEditPostPopup = function (id) {
    $(".select_lists .preview_div").prop("disabled", true);
    if ($('#feed_edit_posts').attr('data-post-id') == undefined) {
        oldPostValue = $("#" + id).find('.preview_div').find('p').html();
        oldPostDescValue = $("#" + id).find('.preview_content').html();
        $("#" + id).find('.preview_div').find('p').html('<input type="text" style="width: 100%;height: 29px;outline: none;box-sizing: border-box;padding: 5px;border: 1px solid #e4e4e4 !important;" maxlength="60" data-post-id="' + id + '" id="feed_edit_posts" value="' + oldPostValue + '">');
        $("#" + id).find('.preview_content').html('<textarea style="height: 150px;border: 1px solid #eaeaea !important;padding: 5px;" placeholder="Description" maxlength="400" data-post-id="' + id + '" id="feed_edit_desciption" >' + oldPostDescValue + '</textarea> ');
        $("#" + id).find('.preview_div').find('#showUpdateBtn').show();
        $('.con_list_action_icon').hide();
    }
}

// Hide edit UI layout for respective post

ZPluginConverse.hideEditPostPopup = function () {
    $(".select_lists .preview_div").prop("disabled", false);
    var id = $('#feed_edit_posts').attr('data-post-id');
    $("#" + id).find('.preview_div').find('p').html(oldPostValue);
    $("#" + id).find('.preview_content').html(oldPostDescValue);
    $("#" + id).find('.preview_div').find('#showUpdateBtn').hide();
    $('.con_list_action_icon').show();
    ZPluginConverse.closeModel();
}

// Show edit UI layout for respective comment

ZPluginConverse.displayEditComment = function (id) {
    if ($('#feed_edit_comments').attr('data-comment-id') == undefined) {
        oldCommentValue = $('#' + id).find('.comment_content:first').html();
        $('#' + id).find('.comment_content:first').html('<div style="width: 100%;"><input type="text" style="width: 100%; height: 29px; outline: none; padding:0px 7px; box-sizing: border-box; margin-bottom: 10px; border: 1px solid #e4e4e4;" data-comment-id="' + id + '" id="feed_edit_comments" maxlength="255" value="' + oldCommentValue + '"/></div><div id="showUpdateBtn1" style="float:right"><button class="btnCancel" onclick="javascript:ZPluginConverse.hideEditCommentPopup();">Cancel</button><button class="btn1" onclick="javascript:ZPluginConverse.editComment();">Update</button></div>');
        $('.con_list_action_icon').hide();
    }
}

// Hide edit UI layout for respective comment

ZPluginConverse.hideEditCommentPopup = function () {
    var id = $('#feed_edit_comments').attr('data-comment-id');
    $("#" + id).find('.comment_content:first').html(oldCommentValue);
    $('.con_list_action_icon').show();
}
