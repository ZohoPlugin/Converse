/* $Id$ */

ZPluginConverse = function () {};

var customerMail, currentUserEmail, currentrecord, entity, entityId, mUserdatas, mentionsInputData, mPostdatas, mCommentdatas, currentUserId, currentZUID, oldPostValue, oldCommentValue, oldPostDescValue, deleteId, deleteType, mPostdatas1;

// Initialize the converse app with relevant details

ZPluginConverse.init = function () {

    mPostdatas1 = []
    mentionsInputData = [];

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
            currentUserEmail = data.users[0].email;
        });

        // fetch post with the current entity id using crm api and append the data to user interface.

        ZOHO.CRM.API.getRecord({
            Entity: data.Entity,
            RecordID: entityId
        })
        .then(function (data) {
            customerMail = data.data[0].Email;
            ZPluginConverse.getPosts();
        })

        // Capture all the user details of the organization for @mentions feature
        ZOHO.CRM.API.getAllUsers({Type:"AllUsers"})
        .then(function(data){
            mUserdatas = data;
            setTimeout(function(){ 
                ZPluginConverse.parseUsersToMentionsInputData(data);
            }, 2000);
        })

        // When text is entered in the title text box, remove the red bar

        $('#title').keyup(function () {
            $('#title').removeClass('error');
        });

        // When text is entered in the comments text area, remove the red bar

        $('#feed_comments').keyup(function () {
            $('#feed_comments').removeClass('error');
        });

        ZPluginConverse.invokeEscapeCharacters();

        //Trigger the add record api when a new post is added and append the data to user interface.

        $('.add_btn').live('click', function () {
            var title = $('#title').val();
            var description = "";
            $('#feed_posts').mentionsInput('val', function(text) {
              description = text;
            });
            if (title.length > 0) {
                $(this).attr('disabled', true);
                ZPluginConverse.addRecord(entity, 'Posts', title, description);
            } else {
                $('#title').addClass('error');
            }
        });

        //Fetch the data from the text inputs, trigger the add record api when a new post is added and append the data under the respective comment.

        $('.comment_post_btn').live('click', function () {
            var description = "";
            $('.add_comment').mentionsInput('val', function(text) {
              description = text;
            });
            var postId = $('.add_comment').attr('data-post-id');
            if (description.length > 0) {
                $(this).attr('disabled', true);
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
            var description = "";
            $(this).parents('.comments_user').find('.reply_txt').mentionsInput('val', function(text) {
              description = text;
            });
            var postId = $(this).parents('.comments_user').find('.reply_txt').attr('data-post-id');
            var commentId = $(this).parents('.comments_user').find('.reply_txt').attr('data-comment-id');
            if (description.length > 0) {
                $(this).attr('disabled', true);
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
            $(this).find('.con_list_action_icon').css('opacity','0.75');
        });

        // Hide edit and delete icon for parent view posts

        $('.select_lists .con_list').live("mouseleave", function () {
            $(this).find('.con_list_action_icon').css('opacity','0');
        });

        // Show edit and delete icon for splitted view posts

        $('.converse_container .converse_list').live("mouseover", function () {
            $(this).find('.action_icon').css('opacity','0.75');
        });

        // Show edit and delete icon for splitted view posts

        $('.converse_container .converse_list').live("mouseleave", function () {
            $(this).find('.action_icon').css('opacity','0');
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
                ZPluginConverse.updateCommentCount($('.zmLSlct').attr('id'), false);
            }
            ZPluginConverse.showAlert();
            if ($('.converse_container .converse_list').length > 0) {
                $('.no_records_div').hide();
            }else{
                $('.no_records_div').show();
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
                ZPluginConverse.disableClickForSplitDiv();
            } else if (type === "Comment") {
                var postId = $('#listOfPosts .zmLSlct').attr('id');
                ZPluginConverse.displayEditComment(id);
            }
            event.preventDefault();
        });

        // Display splitted view and append sub comments for a particular post on clicking the spitted view

        $('.select_lists .preview_div').live('click', function (event) {
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
            ZPluginConverse.hover();
        });

        // Display splitted view and append sub comments for a particular post on clicking the main view

        $('.converse_container .converse_list').live('click', function (event) {
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
            ZPluginConverse.hover();
        });

        // Toggling the reply view on clicking the reply button and removing comment option

        $('.comment_reply').live('click', function () {
            $('.reply_post_btn').hide();
            ZPluginConverse.hideShowReplyBtn();
            $(this).parents('.comments_user').find('.add_reply').toggle();
            $('.no_comments_div').hide();
            $('.reply_txt').val('');
            if ($('#' + $(this).parents('.comments_user').attr('id') + ' .replyed_user_div').length != 0) {
                $(this).parents('.comments_user').find('.comment_reply').css('border-bottom', '1px solid #f3f2f2');
            } else {
                $(this).parents('.comments_user').find('.comment_reply').css('border-bottom', 'none');
            }
        });

        $('.feed_edit_posts').live('click', function (event) {
            event.stopPropagation();
            return false;
        });

        $('.feed_edit_description').live('click', function (event) {
            event.stopPropagation();
            return false;
        });

        ZPluginConverse.closeModel(); // Show default view during initialize
    });

    ZOHO.embeddedApp.init(); // initialize the app

};

// Fetch all posts for the current entity and append data to the user interface.

ZPluginConverse.getPosts = function () {
    $('#listOfPosts').empty();
    var reqData;
    if (entity === "Leads") {
        reqData = {
            Entity: "converse__Posts",
            Type: "criteria",
            Query: "(converse__Lead:equals:" + entityId + ")"
        };
    } else if (entity === "Contacts") {
        reqData = {
            Entity: "converse__Posts",
            Type: "criteria",
            Query: "(converse__Contact:equals:" + entityId + ")"
        };
    }
    ZOHO.CRM.API.searchRecord(reqData) // search records for the particular entity using crm api
        .then(function (data) {
            try {

                var localStorageLen = window.localStorage.length;
                mPostdatas = data.data;
                if ((mPostdatas != undefined) && (mPostdatas.length > 0)) {
                    $('.no_records_div').hide();
                    ZPluginConverse.getPostDetails(mPostdatas); // fetch all posts and append data to user interface from localstorage
                    if (localStorageLen > 0) {
                        if (mPostdatas1.length === undefined) {
                            mPostdatas1 = [];
                        }
                        for (var i = 0; i < window.localStorage.length; i++) {
                            try {
                                var actualKey = window.localStorage.key(i); // fetch all the localstorage keys in the user's browser
                                var splitIdKey = (actualKey.split("_post_")[2]);
                                var splitEntityIdKey = (actualKey.split("_post_")[1]);
                                var splitZuidKey = (actualKey.split("_post_")[0]);

                                if ((splitIdKey!=undefined) && (!splitIdKey.includes("_expiresIn")) && splitIdKey && (splitZuidKey === currentZUID) && (splitEntityIdKey === entityId) && (($("#" + splitIdKey).length == 0) || ($("#m_" + splitIdKey).length == 0))) { // check for valid posts, current logged in user's data and check if the data is already present in user interface.
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
                                var splitIdKey = (actualKey.split("_post_")[2]);
                                var splitEntityIdKey = (actualKey.split("_post_")[1]);
                                var splitZuidKey = (actualKey.split("_post_")[0]);
                                if ((splitIdKey!=undefined) && (!splitIdKey.includes("_expiresIn")) && splitIdKey && (splitZuidKey === currentZUID) && (splitEntityIdKey === entityId) && (($("#" + splitIdKey).length == 0) || ($("#m_" + splitIdKey).length == 0))) {
                                    var postData = getStorage(actualKey);
                                    if (postData != null) {
                                        mPostdatas1[mPostdatas1.length] = JSON.parse(postData);
                                    }
                                }
                            } catch (err) {
                                console.log(err); // print error
                            }
                        }
                        ZPluginConverse.getPostDetails(mPostdatas1, true);
                    } else {
                        setTimeout(function () {
                            $('.bg_container').hide();
                            $('#loading_div').hide();
                            $('.msexchange-wrapper').css('background-color', 'white');
                            $('.converse_container').hide();
                            $('.no_records_div').show();
                        }, 1000);
                    }
                }

            }catch(err){
                console.log(err); // print error
                setTimeout(function () {
                    $('.bg_container').hide();
                    $('#loading_div').hide();
                    $('.converse_container').hide();
                    $('.msexchange-wrapper').css('background-color','white');
                    $('.no_records_div').show();
                }, 3000);
            }
        });
}

// Fetch parent comments for a particular post

ZPluginConverse.getComments = function (postId, ele) {
    $('.SC_ptit_post_section').hide();
    $('#loading_comments_div').show();
    $('#feed_comments').attr('data-post-id', postId);
    var reqData = {
        Entity: "converse__Comments",
        Type: "criteria",
        Query: "((converse__Post:equals:" + postId + ")or(converse__Parent_Comment_ID:equals:null))"
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
        Entity: "converse__Comments",
        Type: "criteria",
        Query: "(converse__Parent_Comment_ID:equals:" + parentCommentId + ")"
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

            var postContent = convertDataToTag(escapeStr(mData.converse__Content));

            if ((postContent === "null") || (postContent == undefined)) {
                postContent = "";
            }

            var mainPostContent = escapeStr(mData.converse__Content);

            if ((mainPostContent === "null") || (mainPostContent == undefined)) {
                mainPostContent = "";
            }

            var createdDate = new Date(mData.Created_Time).toDateString().split(' ').join(',');
            var formattedCreatedDate = createdDate.substring(createdDate.indexOf(',') + 1, createdDate.length).replace(',', ' ').replace(',', ', ');

            var lisofPostUI = '<div class="con_list" id="' + ZSEC.Encoder.encodeForHTMLAttribute(mData.id) + '" data-post="' + ZSEC.Encoder.encodeForHTMLAttribute(mData.id) + '">' +
                '<div class="con_list_icon_div">' +
                '<div class="user_icon"><img src="https://contacts.zoho.com/file?t=user&ID=' + ZSEC.Encoder.encodeForHTML(mData.converse__ZUID) + '&fs=thumb" class="profilep" /></div></div>' +
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
                '<div class="preview_content" data-original-text="'+ZSEC.Encoder.encodeForHTMLAttribute(mainPostContent)+'">' + postContent + '</div>' +
                '<div class="comment_div">' +
                '<div class="fltLt"><span>Comments</span><span> (' + ZSEC.Encoder.encodeForHTML(mData.converse__Comment_Count) + ')</span></div><div id="showUpdateBtn"><button class="btnCancel" onclick="javascript:ZPluginConverse.hideEditPostPopup();">Cancel</button><button style="padding: 7px 14px; margin-right: 4px; background-color: #42a2eb!important; border: solid 1px #42a2eb!important; border-radius: 2px; color: #fff; outline: none; cursor: pointer; font-weight: 600;" onclick="javascript:ZPluginConverse.editPost();">Update</button></div>' +
                '</div>' +
                '</div>' +
                '</div>';
            var lisofPostUI1 = '<div class="converse_list" id="m_' + ZSEC.Encoder.encodeForHTMLAttribute(mData.id) + '">' +
                '<div class="list_div">' +
                '<div class="icon_div1">' +
                '<div class="user_icon"><img src="https://contacts.zoho.com/file?t=user&ID=' + ZSEC.Encoder.encodeForHTML(mData.converse__ZUID) + '&fs=thumb" class="profilep" /></div>' +
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
                '<div class="preview_content" data-original-text="'+ZSEC.Encoder.encodeForHTMLAttribute(mainPostContent)+'">' + postContent + '</div>' +
                '<div class="comment_div">' +
                '<div class="fltLt"><span>Comments</span><span> (' + ZSEC.Encoder.encodeForHTML(mData.converse__Comment_Count) + ')</span></div><div id="showUpdateBtn"><button class="btnCancel"  onclick="javascript:ZPluginConverse.hideEditPostPopup();">Cancel</button><button style="padding: 7px 14px; margin-right: 4px; background-color: #42a2eb!important; border: solid 1px #42a2eb!important; border-radius: 2px; color: #fff; outline: none; cursor: pointer; font-weight: 600;" onclick="javascript:ZPluginConverse.editPost();">Update</button></div>' +
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
        }, 3000);

    } else {
        if (!emptyDiv) {
            setTimeout(function () {
                $('.bg_container').hide();
                $('.msexchange-wrapper').css('background-color', 'white');
                $('.no_records_div').show();
                $('#loading_div').hide();
                $('.converse_container').hide();
            }, 3000);
        }
    }
};

// show posts main view

ZPluginConverse.closeModel = function () {
    $('div').removeClass('zmLSlct');
    $('.converse_container').show();
    $('.feeds_containers').hide();
    var postId = $('#listOfPosts .zmLSlct').attr('id');
    if (postId != undefined) {
        $("#" + postId).find('.preview_div').find('p').html(oldPostValue);
        $("#" + postId).find('.preview_content').html(convertDataToTag(oldPostDescValue));
        $('.con_list_action_icon').show();
        $(".select_lists .preview_div").prop("disabled", false);
    }
}

// Invoke add record of crm api for the respective entity

ZPluginConverse.addRecord = function (current_module, module, title, description, postId, commentId) {
    title = escapeStr(title);
    description = escapeStr(description);
    var api_name;
    var recordData;
    if (module === "Posts") {
        if (title.length > 110) {
            title = title.substring(0, 110) + "...";
        }
        api_name = "converse__Posts";
        if (current_module === "Leads") {
            recordData = {
                "Name": title,
                "converse__ZUID": currentZUID,
                "converse__Content": description,
                "converse__Lead": entityId,
                "converse__Comment_Count": "0"
            }
        } else if (current_module === "Contacts") {
            recordData = {
                "Name": title,
                "converse__ZUID": currentZUID,
                "converse__Content": description,
                "converse__Contact": entityId,
                "converse__Comment_Count": "0"
            }
        }
    } else if (module === "Comments") {
        title = description;
        if (description.length > 110) {
            title = description.substring(0, 110) + "...";
        }
        api_name = "converse__Comments";
        recordData = {
            "Name": title,
            "converse__Comments": description,
            "converse__ZUID": currentZUID,
            "converse__Post": postId
        }
    } else if (module === "Replies") {
        title = description;
        if (description.length > 110) {
            title = description.substring(0, 110) + "...";
        }
        api_name = "converse__Comments";
        if (commentId == undefined) {
            commentId = "";
        }
        recordData = {
            "Name": title,
            "converse__Comments": description,
            "converse__ZUID": currentZUID,
            "converse__Post": postId,
            "converse__Parent_Comment_ID": commentId
        }
    }
    ZPluginConverse.hidepopup();
    ZOHO.CRM.API.insertRecord({
        Entity: api_name,
        APIData: recordData,
        Trigger: ["workflow", "approval", "blueprint"]
    }).then(function (data) { // insert to teh respective entity using crm api and also trigger the workflow, approval, blueprint

        recordData.Created_By = data.data[0].details.Created_By;
        recordData.Created_Time = data.data[0].details.Created_Time;
        recordData.id = data.data[0].details.id;
        ZPluginConverse.showAddResponse(data.data[0], module, postId, commentId, title, description); // append data to user interface
        
    });
}

// update coment count to the respective comment entity

ZPluginConverse.updateCommentCount = function (id, action) {
    var api_name = "converse__Posts";
    var currentCommentCount = "0";
    ZOHO.CRM.API.getRecord({
            Entity: api_name,
            RecordID: id
        })
        .then(function (data) {
            if ((data.data) && (data.data.length > 0)) {
                var mData = data.data[0];
                if (action) {
                    currentCommentCount = parseInt(mData.converse__Comment_Count) + 1;
                } else {
                    if (parseInt(mData.converse__Comment_Count) > 0) {
                        currentCommentCount = parseInt(mData.converse__Comment_Count) - 1;
                    }
                }
                var recordData = {
                    "converse__Comment_Count": "" + currentCommentCount,
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
    title = escapeStr(title);
    description = escapeStr(description);
    var api_name;
    var recordData;
    if (module === "Posts") {
        api_name = "converse__Posts";
        if (title.length > 110) {
            title = title.substring(0, 50) + "...";
        }
        $('#feed_edit_description').mentionsInput('getMentions', function(data) {
            taggedUsers = data;
            ZPluginConverse.sendMailToMentionedUsers(true, taggedUsers, title, $('#feed_edit_description').val());
        });
        recordData = {
            "Name": title,
            "converse__ZUID": currentZUID,
            "converse__Content": description,
            "id": id
        }
    } else if (module === "Comments") {
        api_name = "converse__Comments";
        title = description;

        if (description.length > 110) {
            title = description.substring(0, 110) + "...";
        }
        $('#feed_edit_comments').mentionsInput('getMentions', function(data) {
            taggedUsers = data;
            ZPluginConverse.sendMailToMentionedUsers(false, taggedUsers, title, $('#feed_edit_comments').val());
        });
        recordData = {
            "Name": title,
            "converse__ZUID": currentZUID,
            "converse__Comments": description,
            "id": id
        }
    }

    ZOHO.CRM.API.updateRecord({
        Entity: api_name,
        APIData: recordData
    }).then(function (data) {
        if (module === "Posts") {
            $("#" + id).find('.preview_div').find('p').html(title);
            $("#" + id).find('.preview_content').html(convertDataToTag(description));
            $("#" + id).find('.preview_div').find('#showUpdateBtn').hide();
        } else if (module === "Comments") {
            $("#" + id).find('.comment_content').html(convertDataToTag(description));
        }
    });
}

// Fetch entity details and append data to the user interface.

ZPluginConverse.showAddResponse = function (data1, module, postId, commentId, title, description) {
    var id = data1.details.id;
    var api_name;
    var taggedUsers = [];
    if (data1.status == "success" || data1.status) {
        if (module === "Posts") {
            api_name = "converse__Posts";
            $('#feed_posts').mentionsInput('getMentions', function(data) {
                taggedUsers = data;
                ZPluginConverse.sendMailToMentionedUsers(true, taggedUsers, title, $('#feed_posts').val());
            });
        } else if (module === "Comments") {
            api_name = "converse__Comments";
            $('textarea.add_comment').mentionsInput('getMentions', function(data) {
                taggedUsers = data;
                ZPluginConverse.sendMailToMentionedUsers(false, taggedUsers, title, $('textarea.add_comment').val());
            });
        } else if (module === "Replies") {
            api_name = "converse__Comments";
            $('[data-comment-id='+commentId+']').mentionsInput('getMentions', function(data) {
                taggedUsers = data;
                ZPluginConverse.sendMailToMentionedUsers(false, taggedUsers, title, $('[data-comment-id='+commentId+']').val());
            });
        }
        ZOHO.CRM.API.getRecord({
                Entity: api_name,
                RecordID: id
            })
            .then(function (data) {
                var mData = data.data[0];
                
                if (module === "Posts") {
                    setStorage(currentZUID + "_post_" + entityId + "_post_" + id, JSON.stringify(mData), 200); // push data to localStorage
                    try {
                        mPostdatas.data.unshift(mData);
                    } catch (err) {
                        mPostdatas = {};
                        mPostdatas.data = [];
                        mPostdatas.data[0] = mData;
                    }

                    var postContent = convertDataToTag(escapeStr(mData.converse__Content));

                    if ((postContent === "null") || (postContent == undefined)) {
                        postContent = "";
                    }

                    var mainPostContent = escapeStr(mData.converse__Content);

                    if ((mainPostContent === "null") || (mainPostContent == undefined)) {
                        mainPostContent = "";
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
                        '<div class="user_icon"><img src="https://contacts.zoho.com/file?t=user&ID=' + ZSEC.Encoder.encodeForHTML(mData.converse__ZUID) + '&fs=thumb" class="profilep" /></div></div>' +
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
                        '<div class="preview_content" data-original-text="'+ZSEC.Encoder.encodeForHTMLAttribute(mainPostContent)+'">' + postContent + '</div>' +
                        '<div class="comment_div">' +
                        '<div class="fltLt"><span>Comments</span><span> (' + ZSEC.Encoder.encodeForHTML(mData.converse__Comment_Count) + ')</span></div><div id="showUpdateBtn"><button class="btnCancel" onclick="javascript:ZPluginConverse.hideEditPostPopup();">Cancel</button><button style="padding: 4px 14px 7px; margin-right: 4px; background-color: #42a2eb!important; border: solid 1px #42a2eb!important; border-radius: 2px; color: #fff; outline: none; cursor: pointer; " onclick="javascript:ZPluginConverse.editPost();">Update</button></div>' +
                        '</div>' +
                        '</div>' +
                        '</div>';
                    var lisofPostUI1 = '<div class="converse_list" id="m_' + ZSEC.Encoder.encodeForHTMLAttribute(mData.id) + '">' +
                        '<div class="list_div">' +
                        '<div class="icon_div1">' +
                        '<div class="user_icon"><img src="https://contacts.zoho.com/file?t=user&ID=' + ZSEC.Encoder.encodeForHTML(mData.converse__ZUID) + '&fs=thumb" class="profilep" /></div>' +
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
                        '<div class="preview_content" data-original-text="'+ZSEC.Encoder.encodeForHTMLAttribute(mainPostContent)+'">' + postContent + '</div>' +
                        '<div class="comment_div">' +
                        '<div class="fltLt"><span>Comments</span><span> (' + ZSEC.Encoder.encodeForHTML(mData.converse__Comment_Count) + ')</span></div><div id="showUpdateBtn"><button class="btnCancel" onclick="javascript:ZPluginConverse.hideEditPostPopup();">Cancel</button><button style="padding: 4px 14px 7px; margin-right: 4px; background-color: #42a2eb!important; border: solid 1px #42a2eb!important; border-radius: 2px; color: #fff; outline: none; cursor: pointer; " onclick="javascript:ZPluginConverse.editPost();">Update</button></div>' +
                        '</div>' +
                        '</div>' +
                        '</div>' +
                        '</div>';
                    $('.converse_container').prepend(lisofPostUI1);
                    $('#listOfPosts').prepend(lisofPostUI);
                    ZPluginConverse.hover();
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

                    var commentContent = convertDataToTag(escapeStr(mData.converse__Comments));

                    var mainCommentContent = escapeStr(mData.converse__Comments);

                    if ((mainCommentContent === "null") || (mainCommentContent == undefined)) {
                        mainCommentContent = "";
                    }

                    comment = '<div class="comments_user"  id="' + mData.id + '">' +
                        '<div class="maincommentdiv"><div class="user_info">' +
                        '<div class="con_list_icon_div">' +
                        '<div class="user_icon"><img src="https://contacts.zoho.com/file?t=user&ID=' + ZSEC.Encoder.encodeForHTML(mData.converse__ZUID) + '&fs=thumb" class="profilep"/></div>' +
                        '</div>' +
                        '<div class="con_list_action_icon ' + disabled + '" style="margin-right: 21px;">' +
                        '<div class="edit_icon"></div>' +
                        '<div class="trash_icon"></div>' +
                        '</div>' +
                        '<div class="con_list_user_details">' +
                        '<div class="con_list_user_div">' +
                        '<div style="margin-bottom:8px;"><span class="user_name">' + mData.Created_By.name + '</span> <span class="date_txt">' + ZSEC.Encoder.encodeForHTML(formattedCreatedDate) + 
                        '</span><div class="comment_content" data-original-text="'+ZSEC.Encoder.encodeForHTMLAttribute(mainCommentContent)+'">' + commentContent +
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
                        '<textarea class="reply_txt mention" data-comment-id="' + mData.id + '" data-post-id="' + postId + '" maxlength="500" placeholder="Write reply"></textarea><button class="reply_post_btn">Reply</button><button class="btnCancel1" onclick="javascript:$(\'.add_reply\').hide();$(\'.no_comments_div\').show();$(\'.reply_txt\').val(\'\');$(\'.reply_post_btn\').hide();">Cancel</button>' +

                        '</div>' +
                        '</div>' +
                        '<div class="replyed_user_details_main" id="sub_' + mData.id + '"></div>' +
                        '</div>';
                    $('.comment_list_container').append(comment);
                    $('#' + postId).find('.commentsCount').empty();
                    $('#' + postId).find('.commentsCount').html('Comments (<span class=\"commentsCountTxt\">' + $('.comment_list_container').find('.request_order').length + '</span>)');
                    $('.no_comments_div').remove();
                    var commentsBody = '<div class="no_comments_div">' +
                        '<div class="add_comment_textarea examples">' +
                        '<textarea class="add_comment mention" data-post-id="' + postId + '" maxlength="500"  placeholder="Add a comment"></textarea>' +
                        '</div>' +
                        '<div>' +
                        '<button class="comment_post_btn">Comment</button>' +
                        '</div>' +
                        '</div>';
                    $('.comment_list_container').append(commentsBody);
                    ZPluginConverse.invokeMentionsInput('.no_comments_div', '.add_comment_textarea');
                    $('.no_comments_div').show();
                    ZPluginConverse.hover();
                    ZPluginConverse.loadMentionInput();
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

                    var commentContent = convertDataToTag(escapeStr(mData.converse__Comments));

                    if ((commentContent === "null") || (commentContent == undefined)) {
                        commentContent = "";
                    }

                    var mainCommentContent = escapeStr(mData.converse__Comments);

                    if ((mainCommentContent === "null") || (mainCommentContent == undefined)) {
                        mainCommentContent = "";
                    }

                    comment = '<div class="replyed_user_div" id="' + mData.id + '">' +
                        '<div class="replyed_user_icon_div">' +
                        '<div class="replyed_user_icon"><img src="https://contacts.zoho.com/file?t=user&ID=' + ZSEC.Encoder.encodeForHTML(currentZUID) + '&fs=thumb" class="profilec"></div>' +
                        '</div>' +
                        '<div class="replyed_user_info">' +
                        '<span class="user_name">' + mData.Created_By.name + '</span> ' +
                        '<div class="con_list_action_icon ' + disabled + '">' +
                        '<div class="edit_icon"></div>' +
                        '<div class="trash_icon"></div>' +
                        '</div>' +
                        ' <span class="date_txt">' + ZSEC.Encoder.encodeForHTML(formattedCreatedDate) + '</span>' +
                        '<div class="comment_content" data-original-text="'+ZSEC.Encoder.encodeForHTMLAttribute(mainCommentContent)+'">' + commentContent + '</div></div></div>';
                    $('#sub_' + commentId).append(comment);
                    $('#' + postId).find('.commentsCount').empty();
                    $('#' + postId).find('.commentsCount').html('Comments (<span class=\"commentsCountTxt\">' + $('.comment_list_container').find('.request_order').length + '</span>)');
                    ZPluginConverse.hover();
                    ZPluginConverse.loadMentionInput();
                    $('.no_comments_div').show();
                }
                if (module === "Posts") {
                    $('.add_btn').attr('disabled', false);
                    $('.con_list').css('background-color', 'white');
                    $('.bg_container').show();
                    $('.msexchange-wrapper').css('background-color', '#f5f5f5');
                    $('.no_records_div').hide();
                    ZPluginConverse.closeModel();
                    $("#listOfPosts").scrollTop('0px');
                    $('.zmPT').hide();
                } else if (module === "Comments") {
                    $('#feed_comments').val('');
                    ZPluginConverse.updateCommentCount(postId, true); // update coment count to the respective post entity
                    ZPluginConverse.hideShowCommentBtn();
                    $(".comment_list_container").scrollTop('10000000');
                    $('.comment_post_btn').attr('disabled', false);
                } else if (module === "Replies") {
                    $('.reply_txt').val('');
                    $('.reply_post_btn').attr('disabled', false);
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

            if (typeof (mData.converse__Parent_Comment_ID) != "string") {
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
            var isParent = mData.converse__Parent_Comment_ID;

            if (i <= 0) {
                commentsHeader1 = '';
            }

            var commentContent = convertDataToTag(escapeStr(mData.converse__Comments));

            if ((commentContent === "null") || (commentContent == undefined)) {
                commentContent = "";
            }

            var mainCommentContent = escapeStr(mData.converse__Comments);

            if ((mainCommentContent === "null") || (mainCommentContent == undefined)) {
                mainCommentContent = "";
            }

            comment = '<div class="comments_user"  id="' + mData.id + '" ' + style + '><div class="comments_header" style="padding-top: 10px;"></div>' +
                '<div class="maincommentdiv"><div class="user_info">' +
                '<div class="con_list_icon_div">' +
                '<div class="user_icon"><img src="https://contacts.zoho.com/file?t=user&ID=' + ZSEC.Encoder.encodeForHTML(mData.converse__ZUID) + '&fs=thumb" class="profilep"/></div>' +
                '</div>' +
                '<div class="con_list_action_icon ' + disabled + '">' +
                '<div class="edit_icon"></div>' +
                '<div class="trash_icon"></div>' +
                '</div>' +
                '<div class="con_list_user_details">' +
                '<div class="con_list_user_div">' +
                '<div  style="margin-bottom:8px;"><span class="user_name">' + mData.Created_By.name + '</span> <span class="date_txt">' + ZSEC.Encoder.encodeForHTML(formattedCreatedDate) +
                '</span><div class="comment_content" data-original-text="'+ZSEC.Encoder.encodeForHTMLAttribute(mainCommentContent)+'">' + commentContent +
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
                '<textarea class="reply_txt mention" data-comment-id="' + mData.id + '" data-post-id="' + postId + '" maxlength="500" placeholder="Write reply"></textarea><button class="reply_post_btn">Reply</button><button class="btnCancel1" onclick="javascript:$(\'.add_reply\').hide();$(\'.no_comments_div\').show();$(\'.reply_txt\').val(\'\');$(\'.reply_post_btn\').hide();">Cancel</button>' +
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
        '<div class="add_comment_textarea examples">' +
        '<textarea class="add_comment mention" data-post-id="' + postId + '" maxlength="500"  placeholder="Add a comment"></textarea>' +
        '</div>' +
        '<div>' +
        '<button class="comment_post_btn">Comment</button>' +
        '</div>' +
        '</div>';
    $('.comment_list_container').append(commentsBody);
    ZPluginConverse.loadMentionInput();
    ZPluginConverse.hover();
    $('.no_comments_div').show();
    ZPluginConverse.hideShowCommentBtn();
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

            var commentContent = convertDataToTag(escapeStr(mData.converse__Comments));

            if ((commentContent === "null") || (commentContent == undefined)) {
                commentContent = "";
            }

            var mainCommentContent = escapeStr(mData.converse__Comments);

            if ((mainCommentContent === "null") || (mainCommentContent == undefined)) {
                mainCommentContent = "";
            }
            
            comment = '<div class="replyed_user_div" id="' + mData.id + '">' +
                '<div class="replyed_user_icon_div">' +
                '<div class="replyed_user_icon"><img src="https://contacts.zoho.com/file?t=user&ID=' + ZSEC.Encoder.encodeForHTML(mData.converse__ZUID) + '&fs=thumb" class="profilec"/></div>' +
                '</div>' +
                '<div class="replyed_user_info">' +
                '<span class="user_name">' + mData.Created_By.name + '</span>' +
                '<div class="con_list_action_icon ' + disabled + '">' +
                '<div class="edit_icon"></div>' +
                '<div class="trash_icon"></div>' +
                '</div>' +
                ' <span class="date_txt">' + ZSEC.Encoder.encodeForHTML(formattedCreatedDate) + '</span>' +
                '<div class="comment_content" data-original-text="'+ZSEC.Encoder.encodeForHTMLAttribute(mainCommentContent)+'">' + commentContent +
                '</div>  ' +
                '</div>' +
                '</div>';
            $('#sub_' + parentCommentId).append(comment);
        }
        ZPluginConverse.hover();
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
            Entity: "converse__Posts",
            RecordID: delpostId
        })
        .then(function (data) { 
            if (data.data[0].status == "success") {
                $("#m_" + delpostId).remove();
                $("#" + delpostId).remove();
                removeStorage(currentZUID + "_post_" + entityId + "_post_" + delpostId); // updating localStorage
                ZPluginConverse.closeModel(); 
                ZPluginConverse.invokeDeleteForComments('' + delpostId); // delete all the sub comments of post
                for (var i = 0; i < mPostdatas.length; i++) {
                    if(mPostdatas[i]&&mPostdatas[i].Created_By){
                        var postData = mPostdatas[i];
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
                    $('.no_records_div').show();
                    $('.converse_container').hide();
                }
            }
        });
}

// Method for deleting a parent comment of a post along with its sub comments and updating the comment count in post

ZPluginConverse.deleteComment = function (delCommentId, updpostId) {
    ZPluginConverse.invokeDeleteForChildComments(delCommentId, updpostId);

    // delete the record using CRM API

    ZOHO.CRM.API.deleteRecord({
            Entity: "converse__Comments",
            RecordID: delCommentId
        })
        .then(function (data) {
            if (data.data[0].status == "success") {
                $("#" + delCommentId).remove();
                $('.comment_list_container').find('.comments_header').empty();
                $('.comment_list_container').find('.comments_header').html('<span>' + ($('.comment_list_container').find('.comments_header').length) + '</span>&nbsp;<span>Comments</span>&nbsp;');
                $('.comment_list_container').find('.comments_header').show();
                for (var i = 0; i < mCommentdatas.length; i++) {
                    if(mCommentdatas.data[i]&&mCommentdatas[i].Created_By){
                        var commentData = mCommentdatas[i];
                        var commentCreatedId = commentData.Created_By.id;
                        var commentid = commentData.id;
                        if ((delCommentId + '' === commentid) && (commentCreatedId === currentUserId)) {
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
        Entity: "converse__Comments",
        Type: "criteria",
        Query: "(converse__Post:equals:" + postId + ")"
    };

    // search the comments for a particular post using CRM API

    ZOHO.CRM.API.searchRecord(reqData)
        .then(function (data) {
            if ((data != undefined) && (data.data != undefined)) {
                for (var i = 0; i < data.data.length; i++) {
                    var id = data.data[i].id;
                    ZPluginConverse.deleteComment(id, postId);
                }
            }
        });
}

// Method for deleting the child comments of a comment

ZPluginConverse.invokeDeleteForChildComments = function (parentCommentId, postId) { 
    var reqData = {
        Entity: "converse__Comments",
        Type: "criteria",
        Query: "(converse__Parent_Comment_ID:equals:" + parentCommentId + ")"
    };

    // search for the child comments using parent comment id using CRM API

    ZOHO.CRM.API.searchRecord(reqData)
        .then(function (data) {
            if ((data != undefined) && (data.data != undefined)) {
                for (var i = 0; i < data.data.length; i++) {
                    var id = data.data[i].id;
                    ZPluginConverse.deleteComment(id, postId); // invoke delete for child comment using CRM API
                }
            }
        });
}

// Method for editing a post

ZPluginConverse.editPost = function () {
    var newPost = $('#feed_edit_posts').val();
    var newPostDesc = "";
    $('#feed_edit_description').mentionsInput('val', function(text) {
      newPostDesc = text;
    });
    var editPostId = $('#feed_edit_posts').attr('data-post-id');
    $("#"+editPostId).find('.preview_content').attr('data-original-text', newPostDesc);
    ZPluginConverse.updateRecord("Posts", newPost, newPostDesc, editPostId); // invoke update record for respective post using CRM API who has privilege
    ZPluginConverse.enableClickForSplitDiv();
    $(".select_lists .preview_div").prop("disabled", false);
    $('.con_list_action_icon').show();
}

// Method for editing a comment

ZPluginConverse.editComment = function () {
    var newCommentd = "";
    $('#feed_edit_comments').mentionsInput('val', function(text) {
      newCommentd = text;
    });
    var editCommentId = $('#feed_edit_comments').attr('data-comment-id');
    $("#"+editCommentId).find('.comment_content').attr('data-original-text', newCommentd);
    ZPluginConverse.updateRecord("Comments", undefined, newCommentd, editCommentId); // invoke update record for the respective comment using CRM API who has privilege
    ZPluginConverse.hover();
    $('.con_list_action_icon').show();
}

// Show new post overlay

ZPluginConverse.displaypopup = function () {
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
        ZPluginConverse.deleteComment(deleteId, postId);
        $('.comments_header').slice(1).hide();
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
        oldPostDescValue = $("#" + id).find('.preview_content').attr('data-original-text');

        $("#" + id).find('.preview_div').find('p').html('<input type="text" style="width: 100%;height: 29px;outline: none;box-sizing: border-box;padding: 5px;border: 1px solid #e4e4e4 !important;" maxlength="60" data-post-id="' + id + '" id="feed_edit_posts" value="' + oldPostValue + '">');
        $("#" + id).find('.preview_content').html('<div style="width: 100%;"><textarea maxlength="500" style="height: 150px;border: 1px solid #eaeaea !important;" placeholder="Description" class="mention" maxlength="400" data-post-id="' + id + '" id="feed_edit_description"></textarea></div>');
        ZPluginConverse.invokeMentionsInput('#'+id, '.preview_content', oldPostDescValue);
        $("#" + id).find('.preview_div').find('#showUpdateBtn').show();
        $('.con_list_action_icon').hide();
    }
}

// Hide edit UI layout for respective post

ZPluginConverse.hideEditPostPopup = function () {
    $(".select_lists .preview_div").prop("disabled", false);
    var id = $('#feed_edit_posts').attr('data-post-id');
    $("#" + id).find('.preview_div').find('p').html(oldPostValue);
    $("#" + id).find('.preview_content').html(convertDataToTag(oldPostDescValue));
    $("#" + id).find('.preview_div').find('#showUpdateBtn').hide();
    $('.con_list_action_icon').show();
    ZPluginConverse.closeModel();
    ZPluginConverse.hover();
    ZPluginConverse.enableClickForSplitDiv();
}

// Show edit UI layout for respective comment

ZPluginConverse.displayEditComment = function (id) {
    if ($('#feed_edit_comments').attr('data-comment-id') == undefined) {
        //oldCommentValue = $('#' + id).find('.comment_content:first').html();
        oldCommentValue = $('#' + id).find('.comment_content:first').attr('data-original-text');
        $('#' + id).find('.comment_content:first').html('<div style="width: 100%;"><textarea maxlength="500" style="height: 92px;border: 1px solid #eaeaea !important;" class="mention" data-comment-id="' + id + '" id="feed_edit_comments" >' + oldCommentValue + '</textarea></div><div id="showUpdateBtn1"><button class="btnCancel" onclick="javascript:ZPluginConverse.hideEditCommentPopup();">Cancel</button><button class="btn1" onclick="javascript:ZPluginConverse.editComment();">Update</button></div>');
        ZPluginConverse.invokeMentionsInput('#'+id, '.comment_content', oldCommentValue);
        $('.con_list_action_icon').hide();
    }
}

// Hide edit UI layout for respective comment

ZPluginConverse.hideEditCommentPopup = function () {
    var id = $('#feed_edit_comments').attr('data-comment-id');
    ZPluginConverse.invokeMentionsInput('#'+id, '.comment_content', oldCommentValue);
    $("#" + id).find('.comment_content:first').html(convertDataToTag(oldCommentValue));
    $('.con_list_action_icon').show();
    ZPluginConverse.hover();
}   

ZPluginConverse.parseUsersToMentionsInputData = function (usersObj) {
    var data = usersObj.users;
    mentionsInputData = [];
    for (var i = 0; i < data.length; i++) {
        mentionsInputData[i]={};
        mentionsInputData[i]['id'] = data[i]['zuid'];
        mentionsInputData[i]['email'] = data[i]['email'];
        mentionsInputData[i]['avatar'] = data[i]['image_link'];
        mentionsInputData[i]['name'] = data[i]['full_name'];
        mentionsInputData[i]['userid'] = data[i]['id'];
        mentionsInputData[i]['profile'] = data[i]['profile']['name'];
        mentionsInputData[i]['type'] = 'user';
    }
}

ZPluginConverse.invokeMentionsInput = function (id, div, inputData) {

    $(id).find(div).find('textarea').mentionsInput({

        onDataRequest:function (mode, query, callback) {

          var data = mentionsInputData;

          data = _.filter(data, function(item) { return item.name.toLowerCase().indexOf(query.toLowerCase()) > -1 });

          callback.call(this, data);

        },
        defaultValue: inputData,

    });

    $(id).find(div).find('textarea').mentionsInput('update');

}

ZPluginConverse.fetchUserDetails = function (zuid) {
    var userData = {};

    if (mentionsInputData!=undefined) {
    for (var i = 0; i < mentionsInputData.length; i++) {
        if(mentionsInputData[i]['id']===zuid+""){
            userData['id'] = mentionsInputData[i]['id'];
            userData['email'] = mentionsInputData[i]['email'];
            userData['avatar'] = mentionsInputData[i]['avatar'];
            userData['name'] = mentionsInputData[i]['name'];
            userData['userid'] = mentionsInputData[i]['userid'];
            userData['profile'] = mentionsInputData[i]['profile'];
            userData['type'] = 'user';
        }
    }
}
    return userData;
}

ZPluginConverse.hover = function () {
    $('.preview_content a').hover(function(e){
        var zuid = $(this).attr('data-zuid');
        var scHgt = $('body').innerHeight() - 50;
        var crdHgt = $('#userCardView__'+zuid).outerHeight();

        var x = $(this).offset().left;
        var y = $(this).offset().top + 25;
        
        var balHgt = scHgt - ( crdHgt  +  y);

        if(crdHgt > balHgt){
            $('#userCardView__'+zuid).removeClass('topArrow');
            $('#userCardView__'+zuid).addClass('bottomArrow');
            y = y - crdHgt - 30;
        }else{
            $('#userCardView__'+zuid).removeClass('bottomArrow');
            $('#userCardView__'+zuid).addClass('topArrow');
        }

        $('.cardView').addClass('popupHide');
        $('.cardView').css('top', '0px').css('left', '0px');

        $('#userCardView__'+zuid).removeClass('popupHide');
        $('#userCardView__'+zuid).addClass('popupShow');
        $('#userCardView__'+zuid).css('top', y).css('left', x);
    },function(){
        var zuid = $(this).attr('data-zuid');
        setTimeout(function () {
            $('#userCardView__'+zuid).css('top', '0px').css('left', '0px');
            $('#userCardView__'+zuid).removeClass('popupShow');
            $('#userCardView__'+zuid).addClass('popupHide');
        },2000);
    });
    $('.comment_content a').hover(function(e){
        var zuid = $(this).attr('data-zuid');
        var scHgt = $('body').innerHeight() - 50;
        var crdHgt = $('#userCardView__'+zuid).outerHeight();

        var x = $(this).offset().left;
        var y = $(this).offset().top + 25;
        
        var balHgt = scHgt - ( crdHgt  +  y);

        if(crdHgt > balHgt){
            $('#userCardView__'+zuid).removeClass('topArrow');
            $('#userCardView__'+zuid).addClass('bottomArrow');
            y = y - crdHgt - 30;
        }else{
            $('#userCardView__'+zuid).removeClass('bottomArrow');
            $('#userCardView__'+zuid).addClass('topArrow');
        }

        $('.cardView').addClass('popupHide');
        $('.cardView').css('top', '0px').css('left', '0px');

        $('#userCardView__'+zuid).removeClass('popupHide');
        $('#userCardView__'+zuid).addClass('popupShow');
        $('#userCardView__'+zuid).css('top', y).css('left', x);
    },function(){
        var zuid = $(this).attr('data-zuid');
        setTimeout(function () {
            $('#userCardView__'+zuid).css('top', '0px').css('left', '0px');
            $('#userCardView__'+zuid).removeClass('popupShow');
            $('#userCardView__'+zuid).addClass('popupHide');
        },2000);
    });
}

ZPluginConverse.loadMentionInput = function () {
    $('textarea.mention').mentionsInput({

        onDataRequest:function (mode, query, callback) {

          var data = mentionsInputData;

          data = _.filter(data, function(item) { return item.name.toLowerCase().indexOf(query.toLowerCase()) > -1 });

          callback.call(this, data);

        },

    });
    ZPluginConverse.invokeEscapeCharacters();
}

ZPluginConverse.enableClickForSplitDiv = function () {
    $('.select_lists .preview_div').live('click', function (event) {
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
            ZPluginConverse.hover();
        });
}

ZPluginConverse.disableClickForSplitDiv = function () {
    $('.select_lists .preview_div').die();
}

ZPluginConverse.sendMail = function (isPost, toAddress, title, content) {
    var type = "post";
    if(isPost === true){
        type = "post - [#"+title+"]";
    } else {
        type = "comment.";
    }
    var subject = "[Converse] - " + currentUserName + " has mentioned you on a "+type;
    var subject1 = currentUserName + " has mentioned you on a "+type;
    var mailData = {
        "data" : [
            {
              "from": { "user_name" : currentUserName , "email" : currentUserEmail } ,
              "to": toAddress,
              "subject": subject1,
              "content": "<html><body>Hello,<br>"+subject1+"<br><br>"+content+"<br><br><a href='https://crm.zoho.com/crm/tab/" + entity + "/"+entityId+"'>Click here</a></body></html>",
              "mail_format": "html"
            }
        ]
    }
    var data = {Entity:entity,RecordID:entityId,APIData:mailData};
    ZOHO.CRM.API.sendMail(data).then(function(data){});
}


ZPluginConverse.sendMailToMentionedUsers = function (isPost, taggedUsers, title, description) {

    if (taggedUsers.length>0) {
        for (var i = 0; i < taggedUsers.length; i++) {
            ZPluginConverse.sendMail(isPost, [ { "user_name" : taggedUsers[i].full_name, "email" : taggedUsers[i].email }], title, description);
        }
    }
    
}

ZPluginConverse.hideShowCommentBtn = function () {
    $('.add_comment').keyup(function () {
        var commentText = "";
        $('.add_comment').mentionsInput('val', function(text) {
          commentText = text;
        });
        if (commentText.length > 0) {
            $('.comment_post_btn').show();
        }else{
            $('.comment_post_btn').hide();
        }
    });
}

ZPluginConverse.hideShowReplyBtn = function () {
    $('.reply_txt').keyup(function () {
        var replyText = "";
        $(this).mentionsInput('val', function(text) {
          replyText = text;
        });
        if (replyText.length > 0) {
            $('.reply_post_btn').show();
        }else{
            $('.reply_post_btn').hide();
        }
    });
}


ZPluginConverse.invokeEscapeCharacters = function () {

    $('input').on('keyup blur', function () {
        $(this).val(escapeStr($(this).val()));
        $(this).val(escapeStr($(this).val()));
    });

    $('textarea').on('keyup blur', function () {
        $(this).val(escapeStr($(this).val()));
        $(this).val(escapeStr($(this).val()));
    });

}
