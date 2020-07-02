package main

import (
	"encoding/json"
	"fmt"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/gocolly/colly"
)

// TCo twitter link shortener
type TCo struct {
	Short  string
	Expand string
}

// Video twitter video
type Video struct {
	ID      string
	Preview string
}

// Quote from a retweet with comment
type Quote struct {
	UserName string
	ID       string
	Text     string
	URL      string
}

// Tweet each tweet from said scraped user
type Tweet struct {
	CreatedAtTimestamp int64
	CreatedAt          time.Time
	ID                 string
	Images             []string
	Quote              Quote
	Pinned             bool
	Retweet            bool
	RetweetedBy        string
	URL                string
	Urls               []TCo
	Text               string
	Videos             []Video
}

// User each user's profile
type User struct {
	Avatar    string
	Banner    string
	Biography string
	ID        string
	// JoinedAt          *time.Time
	// JoinedAtTimestamp int64
	Location string
	Name     string
	Private  bool
	URL      string
	Username string
	Website  string
}

// Tweets all the tweets
type Tweets []Tweet

var (
	picRegex = regexp.MustCompile(`(?i)pic.twitter.com\/\w+`)
)

func main() {
	pollInterval := 1

	timerCh := time.Tick(time.Duration(pollInterval) * time.Second)

	for range timerCh {
		run()
	}
}

func run() {
	start := time.Now()
	var tweets = getTweets("fyko")
	JSON, err := json.MarshalIndent(tweets, "", "    ")
	if err != nil {
		panic(err)
	}

	fmt.Println(string(JSON))
	fmt.Println(time.Since(start))
}

func getUser(username string) User {
	c := colly.NewCollector(
		colly.AllowedDomains("twitter.com"),
	)

	var user User
	c.OnHTML(".ProfileHeaderCard", func(e *colly.HTMLElement) {
		_location := strings.TrimSpace(e.DOM.Find(".ProfileHeaderCard-locationText.u-dir").First().Text())
		user.URL = "https://twitter.com/" + username
		// joined, _ := time.Parse("3:4 PM - 2 Jan 2006", e.ChildAttr(".ProfileHeaderCard-joinDateText.u-dir", "title"))
		user.Avatar = e.DOM.Find(".ProfileAvatar-image").First().AttrOr("src", "")
		user.Banner = e.DOM.Find(".ProfileCanopy-headerBg img").First().AttrOr("src", "")
		user.Biography = e.ChildText(".ProfileHeaderCard-bio")
		// user.JoinedAt = &joined
		// user.JoinedAtTimestamp = joined.Unix()
		user.Location = _location
		user.Name = e.ChildText(".ProfileHeaderCard-nameLink")
		user.Username = e.ChildText(".ProfileHeaderCard-screenname")
		user.Website = e.ChildText("div.ProfileHeaderCard-url")
	})

	c.OnHTML(".ProfileNav", func(e *colly.HTMLElement) {
		user.ID = e.Attr("data-user-id")
	})

	c.OnHTML("body", func(e *colly.HTMLElement) {
		_private := e.ChildText(".ProtectedTimeline-heading")
		_find := e.DOM.Find(".ProtectedTimeline-heading")
		if _private == "This account's Tweets are protected." {
			user.Private = true
			user.Avatar = e.DOM.Find(".ProfileAvatar-image").First().AttrOr("src", "")
			user.Banner = e.DOM.Find(".ProfileCanopy-headerBg img").First().AttrOr("src", "")
		} else {
			user.Private = false
		}
		fmt.Println(_find)
	})

	c.OnRequest(func(r *colly.Request) {
		fmt.Println("Visiting", r.URL.String())
	})

	c.OnError(func(r *colly.Response, err error) {
		fmt.Println("OnError ", r.StatusCode, err)
	})

	c.Visit("https://twitter.com/" + username)
	c.Wait()
	return user
}

func getTweets(user string) []Tweet {
	var tweets Tweets

	c := colly.NewCollector(
		colly.AllowedDomains("twitter.com"),
	)

	// c.OnHTML(" #stream-items-id .tweet", func(e *colly.HTMLElement) {
	c.OnHTML(".tweet:not(.modal-body)", func(e *colly.HTMLElement) {
		var tweet Tweet
		_createdAt := e.ChildAttr("._timestamp", "data-time")
		tweet.URL = fmt.Sprintf("https://twitter.com/%s", e.Attr("data-permalink-path"))
		tweet.CreatedAtTimestamp, _ = strconv.ParseInt(_createdAt, 10, 64)
		tweet.CreatedAt = time.Unix(tweet.CreatedAtTimestamp, 0)
		tweet.ID = e.Attr("data-item-id")
		tweet.RetweetedBy = e.Attr("data-retweeter")

		tweet.Text = e.ChildText(".tweet-text")
		tweet.Text = strings.ReplaceAll(tweet.Text, "http", " http")
		tweet.Text = strings.ReplaceAll(tweet.Text, "http", " http")
		tweet.Text = picRegex.ReplaceAllString(tweet.Text, "")

		tweet.Pinned = e.DOM.HasClass("user-pinned")

		if len(tweet.RetweetedBy) > 0 {
			tweet.Retweet = true
		} else {
			tweet.Retweet = false
		}

		e.ForEach(".QuoteTweet-innerContainer", func(_ int, i *colly.HTMLElement) {
			tweet.Quote = Quote{
				UserName: i.Attr("data-screen-name"),
				ID:       i.Attr("data-item-id"),
				Text:     i.ChildText(".tweet-text"),
				URL:      "https://twitter.com" + i.Attr("href"),
			}
		})

		e.ForEach(".AdaptiveMedia-container img", func(_ int, i *colly.HTMLElement) {
			tweet.Images = append(tweet.Images, i.Attr("src"))
		})
		e.ForEach("a.twitter-timeline-link:not(.u-hidden)", func(_ int, i *colly.HTMLElement) {
			tweet.Urls = append(tweet.Urls, TCo{
				Short:  i.Attr("href"),
				Expand: i.Attr("data-expanded-url"),
			})
		})
		e.ForEach(".PlayableMedia-player", func(_ int, i *colly.HTMLElement) {
			if style := i.Attr("style"); len(style) > 1 {
				if strings.Contains(style, "background") {
					match := regexp.MustCompile(`https:\/\/.+\/(\w+)\.jpg`).FindStringSubmatch(style)
					if len(match) == 2 {
						tweet.Videos = append(tweet.Videos, Video{ID: match[1], Preview: match[0]})
					}
				}
			}
		})
		tweets = append(tweets, tweet)
	})

	c.OnRequest(func(r *colly.Request) {
		fmt.Println("Visiting", r.URL.String())
	})

	c.Visit("https://twitter.com/" + user)
	c.Wait()

	return reverseTweets(tweets)
}

func reverseTweets(input []Tweet) []Tweet {
	if len(input) == 0 {
		return input
	}
	return append(reverseTweets(input[1:]), input[0])
}
